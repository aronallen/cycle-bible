import Rx from 'rx';
import RxDOM from 'rx-dom';
import _ from 'lodash';
import LZString from 'lz-string';
import names from './names';
import bookNames from './books';

export function name(bookName) {
  return names[(bookName || '').toUpperCase()];
}

export const books = bookNames;

function storageId(name, locale) {
  return name + ':' + locale;
}

function ajax(name, locale) {
  return Rx.DOM.ajax(function(name) {
      return 'data/' + books[name][locale][0] + '.json';
    }(name))
    .map((o) => {
      return o.response;
    })
    .doAction(function(name, locale) {
      return function(chapters) {
        if (chapters) {
          try {
            localStorage[storageId(name, locale)] = LZString.compress(
              chapters);
          } catch (e) {
            console.error(e);
          }
        } else {

        }

      };
    }(name, locale));
}

function storage(name, locale) {
  return LZString.decompress(localStorage[storageId(name, locale)]);
}

function defaultValue(name, locale) {
  var a = [];
  _.times(books[name][locale][1] || 1, a.push.bind(a));
  return a.map(() => {
    return [];
  });
}

export const data = function book(name, locale = 'da_DK') {

  return ajax(name, locale).catch(function (error) {
      return Rx.Observable.just(storage(name, locale));
    })
    .map((json) => {
      try {
        return JSON.parse(json);
      } catch (e) {
        return defaultValue(name, locale);
      }
    })
    .startWith(defaultValue(name, locale));
};
