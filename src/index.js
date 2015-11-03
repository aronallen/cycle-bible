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
    var orgNode = node;
    while (node && node.matches(selector) === false) {
      node = node.parentNode;
    }
    return node || orgNode;
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
    return DOM.select(selector).events('click').distinctUntilChanged();
  };
}

var locale = 'da_DK';

function locationChanges(DOM) {
  return clicks('a[data-href]')(DOM)
  .merge(taps('a[data-href]')(DOM))
  .doAction(e => e.preventDefault())
  .map(e => e.target)
  .map(findElement('[data-href]'))
  .map(t => t.getAttribute('data-href'));
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


function offlineView () {
  return _.keys(books).filter(k => localStorage[k + ':' + locale]).map(k => [k, name(k)]).map(b => {
    return h('a', {className : 'offline--link', dataset : {href : b[0]}}, b[1]);
  });
}

function chapterView(verses, chapterNo, bookName, bookID) {
  if (verses.length === 0) {
    let offline = offlineView();
    if (offline.length) {
      return h('div', {key : 'offline', className : 'offline'}, [
        header(bookID, chapterNo),
        h('p', {className : 'offline--title'}, name(bookID) + ' kunne ikke vises.'),
        h('h2', {className : 'offline--title'}, 'Følgende bøger er tilgængelige offline:'),
        offlineView()]);
    } else {
      return h('div', {key : 'offline', className : 'offline'}, [
        header(bookID, chapterNo),
        h('h2', {className : 'offline--title'}, 'Ingen bøger er tilgængelige offline')]);
    }

  } else {
    return h('div', {
      key: 'chpt' + chapterNo
    }, [header(bookID, chapterNo)].concat(verses.map(verseView) || []));
  }

}

function bookView(chapters, book) {
  return h('div', {key : 'book' + book}, [header(book)].concat(chapters.map((c, i) => h('a', {
    dataset : {
        'href' : book + '/' + (i + 1)
    }
  }, h('div', {className: 'chapter-cell'}, [i + 1])))));
}

function bibleView(books) {
  return h('div', {key : 'bible'}, [header(), h('div', _.map(books, (b, id) => {
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
  return function({DOM, History, Scroll, Scale}) {
    var $location = locationChanges(DOM).merge(History).distinctUntilChanged();
    var max = _.max(_.keys(books), x => x.length).length;
    var min = _.min(_.keys(books), x => x.length).length;
    var regex = new RegExp('^([A-Z0-9]{'+min+','+max+'})\/?([0-9]+)?');
    return {

      DOM:
      $location
      .flatMapLatest(r => {

        var x = r.match(regex);
        var book = x && x[1];
        var chpt = x && parseInt(x[2], 10);
        if (book && chpt || book && books[book][locale][1] === 1) {
          console.log('looks like a single chapter view', book, chpt, r);
          chpt = chpt || 1;
          return data(book).map(c => [c[chpt - 1], chpt, name(book), book]).map(_.spread(chapterView));
        } else if (book) {
          return data(x[0]).map(c => [c, book]).map(_.spread(bookView));
        } else {
          return Rx.Observable.just(books).map(bibleView);
        }
      }),

      History : $location,
      Scroll : Rx.Observable.combineLatest(Scroll, $location),
      Scale : Scale
    };
  };
}


function scrollStorage() {
  var store = {};

  if (localStorage.latestScroll) {
    let a = localStorage.latestScroll.split(':');
    let path = a[0];
    let position = parseInt(a[1], 10);
    store[path] = position;
  }
  return store;
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
  },

  Scroll  : function ($scroll) {
    var store = scrollStorage();
    //apply scroll
    $scroll
    .distinctUntilChanged(_.last)
    .map(_.last)
    .map((store => path => store[path])(store))
    .delay(1)
    .subscribe(position  => {
      window.scrollTo(0, position | 0);
    });
    //store the scroll positions
    $scroll
    .subscribe(_.spread(_.partialRight((position, path, store) => {
      store[path] = position;
      try {
        localStorage.latestScroll = path + ':' + position;
      } catch (e) {

      }
    }, store)));

    return Rx.Observable.fromEvent(document, 'scroll')
    .map(e => e.target)
    .merge(Rx.Observable.fromEvent(window, 'resize').map(() => document))
    .map(t => t.scrollingElement)
    .map(t => t.scrollTop)
    .startWith(document.scrollingElement.scrollTop);
  },

  Scale : function (styleTag) {
    return function ($scale) {
      $scale

      .map(fz => 'p{ font-size : '+fz+'em }')
      .subscribe(styleText => styleTag.innerText = styleText);


      return Rx.Observable.fromEvent(window, 'gesturestart').flatMapLatest(() =>
        Rx.Observable.fromEvent(window, 'gesturechange').distinctUntilChanged(e => e.scale)
        .bufferWithCount(2)
        .map(e => _.pluck(e, 'scale'))
        .map(_.spread((s1, s2) => s2 / s1)))
      .scan(((acc, x) => Math.min(Math.max(acc * x, 1), 3)), parseFloat(localStorage.scale) || 1)
      .distinctUntilChanged()
      .startWith(parseFloat(localStorage.scale))

      .doAction(s => {
        try {
          localStorage.scale = s.toFixed(3);
        } catch (e) {

        }});
  }}(document.getElementById('scale')),
};

Cycle.run(main(), drivers);
