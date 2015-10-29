import _ from 'lodash';
import Cycle from '@cycle/core';
import CycleDOM from '@cycle/dom';
import Rx from 'rx';
import {
  data, name, books
}
from './book.js';
const h = CycleDOM.h;

var l = {
  chapters: function(chapters) {
    if (Math.abs(chapters) === 1) {
      return '1 kapitel';
    } else {
      return chapters + ' kapitler';
    }
  }
};

function findElement (selector) {
  return function (node) {
    while (node && node.matches(selector) === false) {
      node = node.parentNode;
    }
    return node;
  };
}

function updateLocation (r) {
  location.hash = '#!' + r;
}

function taps (selector) {
  return function (DOM) {
    return DOM.select('a[data-href]').events('touchstart')
    .filter((e) => e.touches.length === 1)
    .flatMapLatest(function (touchbegin) {
        return Rx.Observable.fromEvent(touchbegin.target, 'touchend').map(function (touchbegin) {
          return function (touchend) {
            return [touchbegin, touchend];
          };
        } (touchbegin))

        //ensure we only have one touch
        //ensure we have the same amount of touches

        //ensure pointer hasn't moved X
        .filter(_.spread((touchbegin, touchend) => touchbegin.touches[0].identifier === touchend.changedTouches[0].identifier))
        .filter(_.spread((touchbegin, touchend) => touchbegin.pageX === touchend.pageX))
        //ensure pointer hasn't moved Y
        .filter(_.spread((touchbegin, touchend) => touchbegin.pageY === touchend.pageY))
        //propegate the most recent event
        .map(_.last);
    });
  };
}

function clicks (selector) {
  return function (DOM) {
    return DOM.select(selector).events('click');
  };
}

var locale = 'da_DK';

function locationChanges(DOM) {
  return clicks('a[data-href]')(DOM)
  .merge(taps('a[data-href]')(DOM))
  .doAction(e => e.preventDefault())
  //take all clicks and taps
  .map(e => e.target)
  .map(findElement('[data-href]'))
  .map(t => t.getAttribute('data-href'))
  //avoid duplicates
}



function verseView(v, i) {
  return h('p', {
    className: 'verse'
  }, [
    h('span', {
      className: 'verse--decorator'
    }, [i + 1]), v.replace(/<\/p>/g, '').split(/<br>|<p>/).map(v => _.trim(v) ? h('span', {
      className: 'break'
    }, v) : null)
  ]);
}

function chapterView(verses, chapterNo, bookName, bookID) {
  return h('div', {
    key: 'chpt' + chapterNo,
    className: 'verse'
  }, [header(bookID, chapterNo)].concat(verses.map(verseView) || []));
}

function bookView(chapters, book) {
  return h('div', [header(book)].concat(chapters.map((c, i) => h('a', {
    dataset : {
        'href' : book + '/' + (i + 1)
    }
  }, h('div', {className: 'chapter-cell'}, [i + 1])))));
}

function bibleView(books) {
  return h('div', [header(), h('div', _.map(books, (b, id) => {
    var book = h('a', {
      dataset : {
        'href' : id
      },
      className : 'book'
    }, h('p', name(id)));

    var heading = h('h2', {
      className : 'books'
    }, id === 'MT' ? 'Det nye testamente' : 'Det gamle testamente');

    if (id === 'MT' || id === 'GEN') {
      return [heading, book];
    } else {
      return book;
    }
  }))]);
}

function header(book, chapter) {

  if (book && chapter) {
    var oneChapterBook = book && books[book][locale][1] === 1 || false;
    return h('h1', {className : 'header'}, [h('a', { dataset : {'href' : oneChapterBook ? '' : book}, className : 'header--back'}, '❮'), h('span', {className : 'header--title'}, name(book)), h('span', {className : 'header--chapter'}, [chapter])]);
  } else if (book) {
    return h('h1', {className : 'header'}, [h('a', { dataset : {'href' : ''}, className : 'header--back'}, '❮'), h('span', {className : 'header--title'}, name(book))]);
  } else {
    return h('h1', {className : 'header'}, h('span', {className : 'header--title'}, 'Bibelen'));
  }
}




function main() {
  return function({DOM, History}) {
    var $location = locationChanges(DOM).merge(History).distinctUntilChanged();

    return {

      DOM:
      $location
      //move this to seperate driver?
      .flatMapLatest(r => {
        var x = r.match(/^([A-Z0-9]{2,4})\/?([0-9]+)?/);
        var book = x && x[1];
        var chpt = x && parseInt(x[2], 10);
        //determine which view to use
        if (book && chpt || book && books[book][locale][1] === 1) {
          chpt = chpt || 1;
          return data(book).map(c => [c[chpt - 1], chpt, name(book), book]).map(_.spread(chapterView));
        } else if (book) {
          return data(x[0]).map(c => [c, book]).map(_.spread(bookView));
        } else {
          return Rx.Observable.just(books).map(bibleView);
        }
      }),

      History : $location
    };
  };
}

let drivers = {
  DOM: CycleDOM.makeDOMDriver('#app'),
  History : function ($location) {

    var location = window.location || document.location;

    $location.map(l => '#!' + l)
      .subscribe(l => location.hash = l);
    return Rx.Observable.fromEvent(window, 'hashchange')
      .map(() => location.hash)
      .startWith(window.location.hash).map(l => l.replace(/^#!/, ''));
  }
};

Cycle.run(main(), drivers);
