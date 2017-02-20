language = require('./language/index');
session = require('./language/session');
require('coffee-script/register');


window.makeArtPlease = function(artCode,artCtx) {
  language.run(artCode, {ctx: artCtx});
}


// function makeArtPlease(artCode,artCtx) {
//   language.run(artCode, {ctx: artCtx});
// }
