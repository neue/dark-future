(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
language = require('./language/index');
session = require('./language/session');
require('coffee-script/register');


window.makeArtPlease = function(artCode,artCtx) {
  language.run(artCode, {ctx: artCtx});
}


// function makeArtPlease(artCode,artCtx) {
//   language.run(artCode, {ctx: artCtx});
// }

},{"./language/index":2,"./language/session":13,"coffee-script/register":25}],2:[function(require,module,exports){
/*
 * Language module
 *
 * Stateful, functional module that interprets the draw language
 */

var coffee = require('coffee-script'),
    config,
    session = require('./session'),
    modules = require('./modules/index'),
    ERROR_LOC_REGEX = /\s+at Object\.eval \((.+):(\d+):(\d+)\)/;

/*
 * Reset current drawing session
 *
 * @param {Object} settings
 * @return void
 */
function resetSession(settings) {
    "use strict";
    session.ctx = settings.ctx;
    session.width = settings.width;
    session.height = settings.height;
    session.ratio = settings.ratio || 2;
    session.steps = [];
    modules.general.reset();
}

/*
 * Evaluate draw code with given settings object, returns a error object
 *
 * containing debug info in case of failure
 * @param {String} code
 * @param {Object} settings
 * @return {Object|void}
 */

function run(code, settings) {
    var compiled;
    var splitcode = code.split('\n');
    // config = window.CONFIG;
    code = preCompile(code || '');

    // Reset session
    resetSession(settings);
    session.steps = [];

    // Attempt compiling coffeescript
    try {
        compiled = coffee.compile(code || '', { sourceMap: true });
    } catch (err) {
        // Only warn in console if in debug mode
        // if (config.DEBUG_LEVEL > 0 && !config.PRODUCTION) {
        //     console.warn('[ Compile error ] ' +  err);
        // }

        return {
            message : err.message,
            type    : 'compilation'
        };
    }

    // Evaluate compiled JavaScript in build context
    try {
        evalInContext.bind({})(compiled.js);
    } catch (err) {
        // Trace back error location from compiled source map
        var jsLoc = getErrorLocation(err),
            coffeeLoc = jsLoc ? compiled.sourceMap.sourceLocation(jsLoc) : null;

        // Only warn in console if in debug mode
        // if (config.DEBUG_LEVEL > 0 && !config.PRODUCTION) {
        //     console.warn('[ API error ] ' + err);
        // }
        // return {
        //     message : err.message,
        //     loc     : coffeeLoc,
        //     type    : 'execution'
        // };
        console.log(err);
    }

    if (coffeeLoc) {
      console.log("Error on:"+coffeeLoc);          
      splitcode[coffeeLoc[0]] = '#'+splitcode[coffeeLoc[0]];
      fixedCode = splitcode.join('\n');
      run(fixedCode, settings);
    } else {
      console.log("NO ERRORS");
      fixedCode = splitcode.join('\n');
      realRun(fixedCode, settings);
    }
    module.exports.cursorPosition = session.pos;
}




function realRun(code, settings) {
    var compiled;

    // config = window.CONFIG;
    code = preCompile(code || '');

    // Reset session
    resetSession(settings);
    session.steps = [];

    // Attempt compiling coffeescript
    try {
        compiled = coffee.compile(code || '', { sourceMap: true });
    } catch (err) {
        // Only warn in console if in debug mode
        // if (config.DEBUG_LEVEL > 0 && !config.PRODUCTION) {
        //     console.warn('[ Compile error ] ' +  err);
        // }

        return {
            message : err.message,
            type    : 'compilation'
        };
    }

    // Evaluate compiled JavaScript in build context
    try {
        evalInContext.bind({})(compiled.js);
    } catch (err) {
        // Trace back error location from compiled source map
        var jsLoc = getErrorLocation(err),
            coffeeLoc = jsLoc ? compiled.sourceMap.sourceLocation(jsLoc) : null;

        // Only warn in console if in debug mode
        // if (config.DEBUG_LEVEL > 0 && !config.PRODUCTION) {
        //     console.warn('[ API error ] ' + err);
        // }
        console.log(coffeeLoc);
        return {
            message : err.message,
            loc     : coffeeLoc,
            type    : 'execution'
        };
    }

    module.exports.cursorPosition = session.pos;
}





/*
 * Precompile step - Cleans the code up
 *
 * @param {String} code
 * @return {String}
 */
function preCompile(code) {
    "use strict";
    code = code
    // Only use fat arrow (Block access to Window through `this`)
    .replace(/->/g, '=>')
    // Allow thin arrow on constructor functions
    .replace(/(constructor\s*\:[^\=]*)=>/g, function (match, start) {
        return start + '->';
    });

    return code;
}

/*
 * Dirty-parse error location though error stack
 *
 * @param {Error} err
 * @return [{Number}]
 */
function getErrorLocation(err) {
    "use strict";
    var trace,
        traceTop,
        x,
        y;

    trace = err.stack.split('\n').map(function (line) {
        return line.match(ERROR_LOC_REGEX);
    }).filter(function (match) {
        return match !== null;
    });

    if (trace.length > 0) {
        traceTop = trace[0];

        x = parseInt(traceTop[2], 10) - 1;
        y = parseInt(traceTop[3], 10) - 1;

        return [x, y];
    } else {
        return null;
    }
}

/*
 * Normalise and remove unnecessary bits from the code
 *
 * @param {String} code
 * @return {String}
 */
function strip(code) {
    "use strict";
    if (code) {
        code = code
        // Remove multi-line comments
        .replace(/###((.|\n)*)###/gm, '')
        // Remove inline comments
        .replace(/[^' ](#.*)|^[ ]*(#.*)($|\n)/g, '')
        // Remove spaces
        .replace(/^\s*[\r\n]/gm, '');
        // Trim spaces on edges
        return code.trim();
    }

    return code;
}


function checkValidity(code) {
    "use strict";
    var compiled;
    try {
        compiled = coffee.compile(code || '', { sourceMap: true });
        return true;
    } catch (err) {
        return false;
    }
}

/*
 * Build a contained context containing the draw language API and eval code
 *
 * inside it
 * @param {String} code
 * @return void
 */
function evalInContext(code) {
    /* jshint unused: false, evil: true */
    var stage = {
            width  : session.width,
            height : session.height
        },
        m, c, value;

    // Loop through language modules and declare every property in this block
    for (m in modules) {
        if (modules.hasOwnProperty(m)) {

            for (c in modules[m]) {
                if (modules[m].hasOwnProperty(c)) {
                    // Declare property using eval
                    value = modules[m][c];

                    if (typeof value === 'function') {
                        value = value.bind({});
                    }

                    eval('var ' + c + ' = value;');
                }
            }
        }
    }

    eval(code);
}

module.exports = {
    run   : run,
    strip : strip,
    checkValidity: checkValidity,
    evalInContext: evalInContext
};

},{"./modules/index":5,"./session":13,"coffee-script":15}],3:[function(require,module,exports){
/*
 * Colors language module
 *
 * Collection of color commands
 */

var Color = require('color');

/*
 * Is a dark color (Below 50% brightness)
 *
 * @param {String} color
 * @return {Boolean}
 */
function dark(color) {
    return Color(color).dark();
}

/*
 * Is a light color (Above 50% brightness)
 *
 * @param {String} color
 * @return {Boolean}
 */
function light(color) {
    return Color(color).light();
}

/*
 * Darken a color by given percentage
 *
 * @param {String} color
 * @param {Number} amount
 * @return {String}
 */
function darken(color, amount) {
    return brightness(color, brightness(color) - amount);
}

/*
 * Lighten a color by given percentage
 *
 * @param {String} color
 * @param {Number} amount
 * @return {String}
 */
function lighten(color, amount) {
    return brightness(color, brightness(color) + amount);
}

/*
 * Get color brightness or set it to value if it's passed
 *
 * @param {String} color
 * @param {Number}* amount
 * @return {String|Number}
 */
function brightness(color, amount) {
    return getOrSet('hsl', 2, color, amount);
}

/*
 * Set the brightness of a color
 * @param {String} color
 * @param {Number} amount (between -100 and 100)
 * @return {String}
 */

function setBrightness(color, amount) {
    return brightness(color, brightness(color) + amount/2);
}

/*
 * Saturate a color by given amount (0 to 100)
 *
 * @param {String} color
 * @param {Number} amount
 * @return {String}
 */
function saturate(color, amount) {
    return saturation(color, saturation(color) + amount);
}

/*
 * Set the saturation of a color
 * @param {String} color
 * @param {Number} amount (between -100 and 100)
 * @return {String}
 */

function setSaturation(color, amount) {
    return saturation(color, saturation(color) + amount);
}

/*
 * Desaturate a color by given amount (0 to 100)
 *
 * @param {String} color
 * @param {Number} amount
 * @return {String}
 */
function desaturate(color, amount) {
    return saturation(color, saturation(color) - amount);
}

/*
 * Get color satuation or set it to value if it's passed
 *
 * @param {String} color
 * @param {Number}* amount
 * @return {String|Number}
 */
function saturation(color, amount) {
    return getOrSet('hsl', 1, color, amount);
}

/*
 * Get color hue or set it to value if it's passed
 *
 * @param {String} color
 * @param {Number}* amount
 * @return {String|Number}
 */
function hue(color, amount) {
    return getOrSet('hsl', 0, color, amount);
}

/*
 * Rotate color hue by given amount
 *
 * @param {String} color
 * @param {Number} amount
 * @return {String}
 */
function rotate(color, amount) {
    return Color(color).rotate(amount).rgbaString();
}

/*
 * Get color opacity or set it to value if it's passed
 *
 * @param {String} color
 * @param {Number}* amount
 * @return {String|Number}
 */
function opacity(color, amount) {
    return getOrSet(null, 'alpha', color, amount);
}

/*
 * Increase opacity by given amount
 *
 * @param {String} color
 * @param {Number} amount
 * @return {String}
 */
function opacize(color, amount) {
    return opacity(color, opacity(color) + amount);
}

/*
 * Set the transparency of a color
 * @param {String} color
 * @param {Number} amount (between -100 and 100)
 * @return {String}
 */

function setTransparency(color, amount) {
    return opacity(color, opacity(color) - amount/100);
}

/*
 * Decrease color opacity by given amount
 *
 * @param {String} color
 * @param {Number} amount
 * @return {String}
 */
function transparentize(color, amount) {
    return opacity(color, opacity(color) - amount);
}

/*
 * Mix given colors balancing on given percentage
 *
 * @param {String} a
 * @param {String} b
 * @param {Number} amount
 * @return {String}
 */
function mix(a, b, amount) {
    amount = amount || 50;
    return Color(a).mix(Color(b), amount / 100).rgbaString();
}

/*
 * Get or set utility re-used by methods in this module
 *
 * @param {String|void} mode
 * @param {String} key
 * @param {String} color
 * @param {Number} amount
 * @return {String|Number}
 */
function getOrSet(mode, key, color, amount) {
    color = Color(color);

    if (typeof amount === 'undefined') {
        return mode ? color.values[mode][key] : color.values[key];
    }

    if (key === 'alpha') {
        return color.alpha(amount).rgbaString();
    }

    var values = color.values[mode];

    values[key] = amount;

    return Color().hsl(values).rgbaString();
}

module.exports = {
    dark           : dark,
    light          : light,
    lighten        : lighten,
    darken         : darken,
    brightness     : brightness,
    mix            : mix,
    saturation     : saturation,
    saturate       : saturate,
    desaturate     : desaturate,
    hue            : hue,
    setTransparency : setTransparency,
    rotate         : rotate,
    opacity        : opacity,
    opacize        : opacize,
    transparentize : transparentize,
    setBrightness  : setBrightness,
    setSaturation  : setSaturation
};
},{"color":31}],4:[function(require,module,exports){
/*
 * General language module
 *
 * Collection of generic core commands
 */

var session = require('../session'),
    space = require('./space'),
    setters = require('./setters'),
    text = require('./text'),
    paths = require('./paths'),
    utils = require('../utils');

/*
 * Clear the stage from current drawing
 *
 * @return void
 */
function clear() {
    //BOTCH JOB
    // var width = session.width * session.ratio,
        // height = session.height * session.ratio;
    var width = 500 * 2,
        height = 500 * 2;
        

    session.ctx.clearRect(0, 0, width, height);

    if (session.settings.bg) {
        background(session.settings.bg);
    }

    utils.record('clear');
}

/*
 * Set a background color
 *
 * @param {String} color
 * @return void
 */
function background(color) {
    //BOTCH JOB
    // var width = session.width * session.ratio,
    //    height = session.height * session.ratio;
    var width = 500 * 2,
        height = 500 * 2;
    

    color = utils.parseColor(color);
    session.ctx.globalCompositeOperation = 'destination-over';

    session.settings.bg = color;
    session.ctx.fillStyle = session.settings.bg;
    session.ctx.beginPath();

    session.ctx.rect(0, 0, width, height);
    session.ctx.closePath();
    session.ctx.fill();
    session.ctx.globalCompositeOperation = 'source-over';

    utils.record('background', { color: color });
}

/*
 * Reset session settings to default and clear the stage
 *
 * @return void
 */
function reset() {
    session.pos = utils.getCenter();

    session.settings = {
        bg     : null,
        fill   : '#333',
        stroke : {
            width : 1,
            color : '#222',
            cap   : 'butt'
        },
        text   : {
            size     : 25,
            font     : 'Bariol',
            align    : 'center',
            bold     : false,
            italic   : false,
            baseline : 'alphabetic'
        }
    };

    clear();

    space.moveTo(250, 250);
    setters.strokeColor(session.settings.stroke.color);
    setters.strokeWidth(session.settings.stroke.width);
    paths.lineCap(session.settings.stroke.cap);
    text.updateFont();
    utils.record('reset');
}

/*
 * Get a random number between two numbers, rounded to an integer unless
 * float attribute is set to true
 *
 * @param {Number}* min
 * @param {Number}* max
 * @param {Boolena}* float
 * @return {Number}
 */
function random(min, max, float) {
    var out;

    if (typeof min !== 'number' || typeof max !== 'number') {
        return Math.random();
    }

    out = Math.random() * (max - min) + min;

    if (float) { return out; }

    return Math.floor(out);
}

/*
 * Record a variable declaration 
 * 
 * @param {String} the var name
 * @param {String} the value of the var
 * @return void
 */
function recordVar(name, value) {
    utils.record('var', {
        name: name, 
        value: value
    });
}

/*
 * Records a direct function call 
 * 
 * @param {String} the function name
 * @param {String} the actual params
 * @return void
 */
function recordFunc(name, params) {
    utils.record('func', {
        name: name, 
        params: params
    });
}

/*
 * Record a forloop execution
 * 
 * @param {String} iterator
 * @param {String} range
 * @return void
 */
function recordForLoop(iterator, range) {
    utils.record('for-loop', {
        iterator : iterator,
        range    : range.replace(/\s/g, '')
    });
}

module.exports = {
    background    : background,
    clear         : clear,
    reset         : reset,
    random        : random,
    recordForLoop : recordForLoop,
    recordVar     : recordVar,
    recordFunc    : recordFunc

};
},{"../session":13,"../utils":14,"./paths":7,"./setters":9,"./space":11,"./text":12}],5:[function(require,module,exports){
/*
 * Language modules index
 *
 * Export all language modules in one object
 */

module.exports = {
    colors   : require('./colors'),
    general  : require('./general'),
    palette  : require('./palette.json'),
    paths    : require('./paths'),
    security : require('./security'),
    setters  : require('./setters'),
    shapes   : require('./shapes'),
    space    : require('./space'),
    text     : require('./text')
};
},{"./colors":3,"./general":4,"./palette.json":6,"./paths":7,"./security":8,"./setters":9,"./shapes":10,"./space":11,"./text":12}],6:[function(require,module,exports){
module.exports={
    "aliceblue"            : "#F0F8FF",
    "antiquewhite"         : "#FAEBD7",
    "aqua"                 : "#29c4eb",
    "aquamarine"           : "#4ef6b7",
    "azure"                : "#F0FFFF",
    "beige"                : "#E5DFBD",
    "bisque"               : "#FFE4C4",
    "black"                : "#000000",
    "blanchedalmond"       : "#FFEBCD",
    "blue"                 : "#1b9be2",
    "blueviolet"           : "#955CC9",
    "brown"                : "#A36A42",
    "burlywood"            : "#DEB887",
    "cadetblue"            : "#5F9EA0",
    "charcoal"             : "#333333",
    "chartreuse"           : "#7FFF00",
    "chocolate"            : "#D2691E",
    "coral"                : "#FF7F50",
    "cornflowerblue"       : "#6495ED",
    "cornsilk"             : "#FFF8DC",
    "crimson"              : "#DC143C",
    "cyan"                 : "#0FDDFC",
    "darkblue"             : "#165f88",
    "darkbrown"            : "#5E4323",
    "darkcyan"             : "#33A7B8",
    "darkergray"           : "#333333",
    "darkgoldenrod"        : "#B8860B",
    "darkgray"             : "#A9A9A9",
    "darkgreen"            : "#566b3f",
    "darkkhaki"            : "#BCB585",
    "darkmagenta"          : "#A32E86",
    "darkolivegreen"       : "#556B2F",
    "darkorange"           : "#FF8C00",
    "darkorchid"           : "#9932CC",
    "darkpurple"           : "#593570",
    "darkred"              : "#9A4544",
    "darksalmon"           : "#E9967A",
    "darkseagreen"         : "#8FBC8F",
    "darkslateblue"        : "#483D8B",
    "darkslategray"        : "#2F4F4F",
    "darkturquoise"        : "#00CED1",
    "darkviolet"           : "#9400D3",
    "deeppink"             : "#FF1493",
    "deepskyblue"          : "#00BFFF",
    "dimgray"              : "#696969",
    "dodgerblue"           : "#1E90FF",
    "firebrick"            : "#B22222",
    "floralwhite"          : "#FFFAF0",
    "forestgreen"          : "#228B22",
    "fuchsia"              : "#FF00FF",
    "gainsboro"            : "#DCDCDC",
    "ghostwhite"           : "#F8F8FF",
    "gold"                 : "#FFD700",
    "goldenrod"            : "#DAA520",
    "gray"                 : "#808080",
    "green"                : "#9BCE64",
    "greenyellow"          : "#ADFF2F",
    "honeydew"             : "#F0FFF0",
    "hotpink"              : "#FF69B4",
    "indianred"            : "#CD5C5C",
    "indigo"               : "#4B0082",
    "ivory"                : "#FFFFF0",
    "khaki"                : "#F0E68C",
    "lavender"             : "#E6E6FA",
    "lavenderblush"        : "#FFF0F5",
    "lawngreen"            : "#7CFC00",
    "lemonchiffon"         : "#FFFACD",
    "lightblue"            : "#4cfdf3",
    "lightbrown"           : "#e49d6b",
    "lightcoral"           : "#F08080",
    "lightcyan"            : "#E0FFFF",
    "lightgoldenrodyellow" : "#FAFAD2",
    "lightgray"            : "#aaaaaa",
    "lightgray"            : "#D3D3D3",
    "lightgreen"           : "#90EE90",
    "lightpink"            : "#FFB6C1",
    "lightsalmon"          : "#FFA07A",
    "lightseagreen"        : "#20B2AA",
    "lightskyblue"         : "#87CEFA",
    "lightslategray"       : "#778899",
    "lightsteelblue"       : "#B0C4DE",
    "lightyellow"          : "#FFFFE0",
    "lime"                 : "#B3F55E",
    "limegreen"            : "#32CD32",
    "linen"                : "#FAF0E6",
    "magenta"              : "#EF3AC7",
    "maroon"               : "#800000",
    "mediumaquamarine"     : "#66CDAA",
    "mediumblue"           : "#0000CD",
    "mediumorchid"         : "#BA55D3",
    "mediumpurple"         : "#9370DB",
    "mediumseagreen"       : "#3CB371",
    "mediumslateblue"      : "#7B68EE",
    "mediumspringgreen"    : "#00FA9A",
    "mediumturquoise"      : "#48D1CC",
    "mediumvioletred"      : "#C71585",
    "midnightblue"         : "#191970",
    "mintcream"            : "#F5FFFA",
    "mistyrose"            : "#FFE4E1",
    "moccasin"             : "#FFE4B5",
    "navajowhite"          : "#FFDEAD",
    "navy"                 : "#000080",
    "oldlace"              : "#FDF5E6",
    "olive"                : "#808000",
    "olivedrab"            : "#6B8E23",
    "orange"               : "#FF842A",
    "orangered"            : "#FF4500",
    "orchid"               : "#DA70D6",
    "palegoldenrod"        : "#EEE8AA",
    "palegreen"            : "#98FB98",
    "paleturquoise"        : "#AFEEEE",
    "palevioletred"        : "#DB7093",
    "papayawhip"           : "#FFEFD5",
    "peachpuff"            : "#FFDAB9",
    "peru"                 : "#CD853F",
    "pink"                 : "#F8C9B9",
    "plum"                 : "#BB99BB",
    "powderblue"           : "#B0E0E6",
    "purple"               : "#9F5FAD",
    "rebeccapurple"        : "#663399",
    "red"                  : "#E95C5A",
    "rosybrown"            : "#BC8F8F",
    "royalblue"            : "#4169E1",
    "saddlebrown"          : "#8B4513",
    "salmon"               : "#ED8E74",
    "sandybrown"           : "#F4A460",
    "seagreen"             : "#2E8B57",
    "seashell"             : "#FFF5EE",
    "sienna"               : "#A0522D",
    "silver"               : "#C0C0C0",
    "skyblue"              : "#87CEEB",
    "slateblue"            : "#6A5ACD",
    "slategray"            : "#708090",
    "snow"                 : "#FFFAFA",
    "springgreen"          : "#00FF7F",
    "steelblue"            : "#4682B4",
    "tan"                  : "#D2B48C",
    "teal"                 : "#008080",
    "thistle"              : "#D8BFD8",
    "tomato"               : "#FF6347",
    "turquoise"            : "#40E0D0",
    "violet"               : "#EE82EE",
    "wheat"                : "#F5DEB3",
    "white"                : "#FFFFFF",
    "whitesmoke"           : "#F5F5F5",
    "yellow"               : "#ffd839",
    "yellowgreen"          : "#9ACD32"
}

},{}],7:[function(require,module,exports){
/*
 * Paths language module
 *
 * Collection of path commands
 */

var space = require('./space'),
    session = require('../session'),
    utils = require('../utils');

/*
 * Draw a line from current cursor position to absolute x and y coordinates
 *
 * @param {Number} x
 * @param {Number} y
 * @return void
 */
function lineTo(x, y) {
    var ratio = session.ratio;

    var pos = utils.parseCoordinates(x, y),
        from = {
            x : session.pos.x,
            y : session.pos.y
        };

    x = pos.x;
    y = pos.y;

    space.moveTo(session.pos.x, session.pos.y, false);
    utils.startShape();
    session.ctx.moveTo(from.x * ratio, from.y * ratio);
    session.ctx.lineTo(x * ratio, y * ratio);
    utils.endShape();

    utils.record('line', {
        xa    : from.x,
        ya    : from.y,
        xb    : x,
        yb    : y,
        dx    : x - from.x,
        dy    : y - from.y,
        style : session.settings.stroke
    });
}

/*
 * Draw a line from current cursor position to relative x and y coordinates
 *
 * @param {Number} x
 * @param {Number}* y
 * @return void
 */
function line(x, y) {
    y = y || 0;

    lineTo(session.pos.x + x, session.pos.y + y);
}

/*
 * Set linecap to given type
 *
 * @param {String} type
 * @return void
 */
function lineCap(type) {
    session.ctx.lineCap = type;
    utils.record('line-cap', { type: type });
}

module.exports = {
    lineTo  : lineTo,
    line    : line,
    lineCap : lineCap
};
},{"../session":13,"../utils":14,"./space":11}],8:[function(require,module,exports){
/*
 * Security module
 *
 * Override core objects in the language scope to evaluate in a secured scope
 */

var OVERRIDES = [
    'window',
    'top',
    'Window',
    'Document',
    'document',
    'console',
    'alert',
    'addEventListener',
    'removeEventListener',
    'releaseEvents',
    'localStorage',
    'KW_SDK',
    'angular',
    'app',
    '$',
    'open',
    'location',
    'parent',
    'postMessage',
    'print',
    'profile',
    'prompt',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'scroll',
    'scrollBy',
    'scrollTo',
    'scrollX',
    'scrollY',
    'session',
    'sessionStorage',
    'setTimeout',
    'setInterval'
];

module.exports = {};

// Build exports object
OVERRIDES.forEach(function (key) {
    module.exports[key] = null;
});

},{}],9:[function(require,module,exports){
/*
 * Setters language module
 *
 * Collection of setup commands
 */

var session = require('../session'),
    utils = require('../utils');

/*
 * Set current session stroke color
 *
 * @param {String} color
 * @return void
 */
function strokeColor(color) {
    color = utils.parseColor(color);
    session.settings.stroke.color = color;
    session.ctx.strokeStyle = color;
    utils.record('stroke-color', { color: color });
}

/*
 * Set current session stroke width
 *
 * @param {Number} val
 * @return void
 */
function strokeWidth(val) {
    session.settings.stroke.width = val;
    session.ctx.lineWidth = val * session.ratio;
    utils.record('stroke-width', { width: val });
}

/*
 * Set current session mixed stroke attributes
 *
 * @param {*...} attributes
 * @return void
 */
function stroke() {
    var style = utils.parseLineStyle(arguments);
    if (style.color) { strokeColor(style.color); }
    if (typeof style.width !== 'undefined') { strokeWidth(style.width); }
}

/*
 * Set current session fill color
 *
 * @param {String} color
 * @return void
 */
function color(val) {
    val = utils.parseColor(val);
    session.settings.fill = val || 'transparent';
    utils.record('color', { color: val });
}

module.exports = {
    strokeColor : strokeColor,
    strokeWidth : strokeWidth,
    stroke      : stroke,
    color       : color,
    colour      : color
};
},{"../session":13,"../utils":14}],10:[function(require,module,exports){
/*
 * Shapes language module
 *
 * Collection of shape commands
 */

var session = require('../session'),
    utils = require('../utils');

/*
 * Draw a rectangle using current cursor position as origin
 *
 * @param {Number} width
 * @param {Number} height
 * @return void
 */
function rectangle(width, height) {
    utils.startShape();

    utils.record('rectangle', {
        x        : session.pos.x,
        y        : session.pos.y,
        width    : width,
        height   : height,
        isSquare : width === height
    });

    var x = session.pos.x * session.ratio,
        y = session.pos.y * session.ratio;

    width *= session.ratio;
    height *= session.ratio;

    session.ctx.rect(x, y, width, height);
    utils.endShape();
}

/*
 * Draw a square using current cursor position as origin
 *
 * @param {Number} size
 * @return void
 */
function square(size) {
    rectangle(size, size);
}

/*
 * Base function to draw an arc using current cursor position as origin, rx
 * and ry as x and y radiuses, start and end values ranging from 0 to 2,
 * close back for path creation.
 * This function is used as a base for other functions in this module
 *
 * @param {Number} rx
 * @param {Number} ry
 * @param {Number} start
 * @param {Number} end
 * @param {Boolean} close
 * @param {Boolean} back
 * @return void
 */
function drawArc(rx, ry, start, end, close, back) {
    utils.startShape();

    var x = session.pos.x * session.ratio,
        y = session.pos.y * session.ratio;

    rx *= session.ratio;
    ry *= session.ratio;

    var startingAngle = start * Math.PI,
        endingAngle = end * Math.PI; // 360 degrees is equal to 2π radians

    session.ctx.save();
    session.ctx.translate(x, y);
    session.ctx.scale(rx, ry);
    session.ctx.arc(0, 0, 1, startingAngle, endingAngle, -1);
    session.ctx.restore();

    utils.endShape(close, back);
}


/*
 * Draw an ellipse using current cursor position as origin
 *
 * @param {Number} rx
 * @param {Number} ry
 * @return void
 */
function ellipse(rx, ry) {
    drawArc(rx, ry, 0, 2);

    utils.record('ellipse', {
        x        : session.pos.x,
        y        : session.pos.y,
        rx       : rx,
        ry       : ry,
        isCircle : rx === ry
    });
}

/*
 * Simplified wrapper function to draw an arc
 *
 * @param {Number} radius
 * @param {Number} start
 * @param {Number} end
 * @param {Boolean} close
 * @return void
 */
function arc(radius, start, end, close) {
    drawArc(radius, radius, start, end, close || false, close || false);

    utils.record('arc', {
        x      : session.pos.x,
        y      : session.pos.y,
        radius : radius,
        start  : start,
        end    : end
    });
}

/*
 * Draw a circle using current cursor position as origin
 *
 * @param {Number} radius
 * @return void
 */
function circle(radius) {
    ellipse(radius, radius);
}

/*
 * Draw a polygon using every two arguments as coordinates for a new point
 *
 * @param {Number} radius
 * @return void
 */
function polygon() {
    var lastArg = arguments[arguments.length - 1],
        close = lastArg === true || lastArg === false ? lastArg : false,
        baseX = session.pos.x * session.ratio,
        baseY = session.pos.y * session.ratio,
        points = [];

    utils.startShape();
    session.ctx.save();
    session.ctx.lineTo(baseX, baseY);

    points.push({ x: 0, y: 0 });

    for (var i = 0; i < arguments.length; i += 2) {
        session.ctx.lineTo(
            baseX + arguments[i] * session.ratio,
            baseY + arguments[i + 1] * session.ratio
            );

        points.push({ x: arguments[i], y: arguments[i + 1] });
    }

    session.ctx.restore();

    utils.endShape(close);

    utils.record('polygon', { points: points });
}

module.exports = {
    rectangle : rectangle,
    square    : square,
    ellipse   : ellipse,
    circle    : circle,
    arc       : arc,
    polygon   : polygon
};
},{"../session":13,"../utils":14}],11:[function(require,module,exports){
/*
 * Space language module
 *
 * Collection of spacial and movement commands
 */

var session = require('../session'),
    utils = require('../utils');

/*
 * Move cursor to absolute x and y positions
 *
 * @param {Number} x
 * @param {Number} y
 * @param {Boolean} record
 * @return void
 */
function moveTo(x, y, record) {
    record = typeof record === 'undefined' ? true : record;

    x = x || 0;
    y = y || 0;

    var pos = utils.parseCoordinates(x, y),
        dx = pos.x - session.pos.x,
        dy = pos.y - session.pos.y;

    x = pos.x;
    y = pos.y;

    session.pos = { x: x, y: y };

    if (record) {
        utils.record('move-to', {
            x  : x,
            y  : y,
            dx : dx,
            dy : dy
        });
    }

    x = session.pos.x * session.ratio;
    y = session.pos.y * session.ratio;

    session.ctx.moveTo(x, y);
}

/*
 * Move cursor by relative x and y amounts
 *
 * @param {Number} x
 * @param {Number} y
 * @param {Boolean} record
 * @return void
 */
function move(x, y, record) {
    y = y || 0;
    moveTo(session.pos.x + x, session.pos.y + y, record);
}

module.exports = {
    moveTo : moveTo,
    move   : move
};
},{"../session":13,"../utils":14}],12:[function(require,module,exports){
/*
 * Text language module
 *
 * Collection of text commands
 */

var session = require('../session'),
    utils = require('../utils');

/*
 * Set updated font with new key / val setting
 *
 * @param {String} key
 * @param {*} val
 * @return void
 */
function updateFont(key, val) {
    if (key) {
        session.settings.text[key] = val;
    }

    var size = session.settings.text.size * session.ratio,
        format = '';

    if (session.settings.text.italic) { format += 'italic '; }
    if (session.settings.text.bold) { format += 'bold '; }

    session.ctx.font = format + size + 'px ' + session.settings.text.font;
    session.ctx.textAlign = session.settings.text.align;
    session.ctx.textBaseline = session.settings.text.baseline;
}

/*
 * Set bold state (Defaults to true)
 *
 * @param {Boolean} state
 * @return void
 */
function bold(state) {
    state = typeof state === 'undefined' ? true : state;
    updateFont('bold', state);

    utils.record('text-bold', {
        state : state
    });
}

/*
 * Set italic state (Defaults to true)
 *
 * @param {Boolean} state
 * @return void
 */
function italic(state) {
    state = typeof state === 'undefined' ? true : state;
    updateFont('italic', state);

    utils.record('text-italic', {
        state : state
    });
}

/*
 * Set text size
 *
 * @param {Number} size
 * @return void
 */
function textSize(size) {
    updateFont('size', size);

    utils.record('text-size', {
        size : size
    });
}

/*
 * Set font family
 *
 * @param {String} font
 * @return void
 */
function fontFamily(font) {
    updateFont('font', font);

    utils.record('font-family', {
        font : font
    });
}

/*
 * Set text alignment
 *
 * @param {String} alignment
 * @return void
 */
function textAlign(alignment) {
    updateFont('align', alignment);

    utils.record('text-align', {
        alignment : alignment
    });
}

/*
 * Set text baseline mode
 *
 * @param {String} baseline
 * @return void
 */
function textBaseline(baseline) {
    baseline = baseline || 'alphabetic';
    updateFont('baseline', baseline);

    utils.record('text-baseline', {
        baseline : baseline
    });
}

/*
 * Set font mixed attributes
 *
 * @param {*..} attributes
 * @return void
 */
function font() {
    var val, i;

    for (i = 0; i < arguments.length; i += 1) {
        val = arguments[i];

        if (typeof val === 'number') {
            textSize(val);
        } else if (val === 'left', val === 'right', val === 'center') {
            textAlign(val);
        } else if (typeof val === 'string') {
            fontFamily(val);
        }
    }
}

/*
 * Draw text with current cursor position as origin and current text settings
 *
 * @param {String} font
 * @return void
 */
function text(val) {
    var x = session.pos.x * session.ratio,
        y = session.pos.y * session.ratio;

    session.ctx.fillStyle = session.settings.fill;
    session.ctx.fillText(val, x, y);

    utils.record('text', {
        value : val,
        x     : x,
        y     : y
    });
}

module.exports = {
    updateFont   : updateFont,
    textSize     : textSize,
    fontFamily   : fontFamily,
    font         : font,
    text         : text,
    bold         : bold,
    italic       : italic,
    textAlign    : textAlign,
    textBaseline : textBaseline
};
},{"../session":13,"../utils":14}],13:[function(require,module,exports){
/*
 * Session module
 *
 * This module holds the session for the Drawing module
 */

module.exports = {};
},{}],14:[function(require,module,exports){
/*
 * Utils language module
 *
 * Basic collection of utility commands
 */

var session = require('./session'),
    palette = require('./modules/palette.json');
/*
 * Begin a vector shape path on current context
 *
 * @return void
 */
function startShape() {
    session.ctx.beginPath();
}

/*
 * End a vector shape path on current context, close and bring back to origin
 *
 * if specified
 * @param {Boolean} close
 * @param {Boolean} back
 * @return void
 */
function endShape(close, back) {
    close = typeof close === 'undefined' ? true : close;

    if (back) {
        session.ctx.lineTo(session.pos.x * session.ratio, session.pos.y * session.ratio);
    }

    if (close) {
        session.ctx.closePath();
    }

    if (session.settings.stroke.width) {
        session.ctx.stroke();
    }

    session.ctx.fillStyle = session.settings.fill;
    session.ctx.fill();
}

/*
 * Parse stroke attributes from string and return stroke settings object
 *
 * @param {Boolean} close
 * @return {Object}
 */
function parseLineStyle(attributes) {
    var out = {},
        i, attr;

    for (i = 0 ; i < attributes.length; i += 1) {
        attr = attributes[i];

        if (typeof attr === 'number') {
            out.width = attr;
        } else {
            out.color = attr;
        }
    }

    return out;
}

/*
 * Parse or evaluate a coordinate from string or number
 *
 * @param {String|Number} val
 * @param {String} type
 * @return {Number}
 */
function parseCoordinate(val, type) {
    type = type || 'x';

    if (typeof val === 'string') {
        if (type === 'x') {
            switch (val) {
                case 'center':
                    return getCenter().x;
                case 'right':
                    return session.width;
                case 'left':
                    return 0;
            }
        } else if (type === 'y') {
            switch (val) {
                case 'center':
                    return getCenter().y;
                case 'bottom':
                    return session.height;
                case 'top':
                    return 0;
            }
        }
    }

    return val;
}

/*
 * Parse a pair of x / y coordinates
 *
 * @param {String|Number} x
 * @param {String|Number} y
 * @return {Object}
 */
function parseCoordinates(x, y) {
    x = parseCoordinate(x, 'x');
    y = parseCoordinate(y, 'y');

    return { x: x, y: y };
}

/*
 * Get stage center in current session
 *
 * @return {Object}
 */
function getCenter() {
    return {
        x : session.width / 2,
        y : session.height / 2
    };
}

/*
 * Record a step in current session history
 *
 * @param {String} type
 * @param {Object} options
 * @return void
 */
function recordStep(type, options) {
    session.steps.push({
        type    : type,
        options : options
    });
}

/*
 * Get a color from palette if it's an existing key or just return
 *
 * @param {String} val
 * @return void
 */
function parseColor(val) {
    return palette[val] || val;
}

/*
 * Given value is a valid color
 *
 * @param {*} val
 * @return {Boolean}
 */
function isColorValue(val) {
    if (typeof val !== 'string') { return false; }

    if (val.substr(0, 1) === '#' && val.length > 3 && val.length <= 7) {
        return true;
    } else if (palette[val]) {
        return true;
    }

    return false;
}

module.exports = {
    startShape       : startShape,
    endShape         : endShape,
    parseLineStyle   : parseLineStyle,
    parseCoordinate  : parseCoordinate,
    parseCoordinates : parseCoordinates,
    getCenter        : getCenter,
    record           : recordStep,
    parseColor       : parseColor,
    isColorValue     : isColorValue
};
},{"./modules/palette.json":6,"./session":13}],15:[function(require,module,exports){
(function (process,global,Buffer){
// Generated by CoffeeScript 1.12.2
(function() {
  var Lexer, SourceMap, base64encode, compile, ext, fn1, fs, helpers, i, len, lexer, packageJson, parser, path, ref, vm, withPrettyErrors,
    hasProp = {}.hasOwnProperty;

  fs = require('fs');

  vm = require('vm');

  path = require('path');

  Lexer = require('./lexer').Lexer;

  parser = require('./parser').parser;

  helpers = require('./helpers');

  SourceMap = require('./sourcemap');

  packageJson = require('../../package.json');

  exports.VERSION = packageJson.version;

  exports.FILE_EXTENSIONS = ['.coffee', '.litcoffee', '.coffee.md'];

  exports.helpers = helpers;

  base64encode = function(src) {
    switch (false) {
      case typeof Buffer !== 'function':
        return new Buffer(src).toString('base64');
      case typeof btoa !== 'function':
        return btoa(encodeURIComponent(src).replace(/%([0-9A-F]{2})/g, function(match, p1) {
          return String.fromCharCode('0x' + p1);
        }));
      default:
        throw new Error('Unable to base64 encode inline sourcemap.');
    }
  };

  withPrettyErrors = function(fn) {
    return function(code, options) {
      var err;
      if (options == null) {
        options = {};
      }
      try {
        return fn.call(this, code, options);
      } catch (error) {
        err = error;
        if (typeof code !== 'string') {
          throw err;
        }
        throw helpers.updateSyntaxError(err, code, options.filename);
      }
    };
  };

  exports.compile = compile = withPrettyErrors(function(code, options) {
    var currentColumn, currentLine, encoded, extend, fragment, fragments, generateSourceMap, header, i, j, js, len, len1, map, merge, newLines, ref, ref1, sourceMapDataURI, sourceURL, token, tokens, v3SourceMap;
    merge = helpers.merge, extend = helpers.extend;
    options = extend({}, options);
    generateSourceMap = options.sourceMap || options.inlineMap;
    if (generateSourceMap) {
      map = new SourceMap;
    }
    tokens = lexer.tokenize(code, options);
    options.referencedVars = (function() {
      var i, len, results;
      results = [];
      for (i = 0, len = tokens.length; i < len; i++) {
        token = tokens[i];
        if (token[0] === 'IDENTIFIER') {
          results.push(token[1]);
        }
      }
      return results;
    })();
    if (!((options.bare != null) && options.bare === true)) {
      for (i = 0, len = tokens.length; i < len; i++) {
        token = tokens[i];
        if ((ref = token[0]) === 'IMPORT' || ref === 'EXPORT') {
          options.bare = true;
          break;
        }
      }
    }
    fragments = parser.parse(tokens).compileToFragments(options);
    currentLine = 0;
    if (options.header) {
      currentLine += 1;
    }
    if (options.shiftLine) {
      currentLine += 1;
    }
    currentColumn = 0;
    js = "";
    for (j = 0, len1 = fragments.length; j < len1; j++) {
      fragment = fragments[j];
      if (generateSourceMap) {
        if (fragment.locationData && !/^[;\s]*$/.test(fragment.code)) {
          map.add([fragment.locationData.first_line, fragment.locationData.first_column], [currentLine, currentColumn], {
            noReplace: true
          });
        }
        newLines = helpers.count(fragment.code, "\n");
        currentLine += newLines;
        if (newLines) {
          currentColumn = fragment.code.length - (fragment.code.lastIndexOf("\n") + 1);
        } else {
          currentColumn += fragment.code.length;
        }
      }
      js += fragment.code;
    }
    if (options.header) {
      header = "Generated by CoffeeScript " + this.VERSION;
      js = "// " + header + "\n" + js;
    }
    if (generateSourceMap) {
      v3SourceMap = map.generate(options, code);
    }
    if (options.inlineMap) {
      encoded = base64encode(JSON.stringify(v3SourceMap));
      sourceMapDataURI = "//# sourceMappingURL=data:application/json;base64," + encoded;
      sourceURL = "//# sourceURL=" + ((ref1 = options.filename) != null ? ref1 : 'coffeescript');
      js = js + "\n" + sourceMapDataURI + "\n" + sourceURL;
    }
    if (options.sourceMap) {
      return {
        js: js,
        sourceMap: map,
        v3SourceMap: JSON.stringify(v3SourceMap, null, 2)
      };
    } else {
      return js;
    }
  });

  exports.tokens = withPrettyErrors(function(code, options) {
    return lexer.tokenize(code, options);
  });

  exports.nodes = withPrettyErrors(function(source, options) {
    if (typeof source === 'string') {
      return parser.parse(lexer.tokenize(source, options));
    } else {
      return parser.parse(source);
    }
  });

  exports.run = function(code, options) {
    var answer, dir, mainModule, ref;
    if (options == null) {
      options = {};
    }
    mainModule = require.main;
    mainModule.filename = process.argv[1] = options.filename ? fs.realpathSync(options.filename) : '.';
    mainModule.moduleCache && (mainModule.moduleCache = {});
    dir = options.filename ? path.dirname(fs.realpathSync(options.filename)) : fs.realpathSync('.');
    mainModule.paths = require('module')._nodeModulePaths(dir);
    if (!helpers.isCoffee(mainModule.filename) || require.extensions) {
      answer = compile(code, options);
      code = (ref = answer.js) != null ? ref : answer;
    }
    return mainModule._compile(code, mainModule.filename);
  };

  exports["eval"] = function(code, options) {
    var Module, _module, _require, createContext, i, isContext, js, k, len, o, r, ref, ref1, ref2, ref3, sandbox, v;
    if (options == null) {
      options = {};
    }
    if (!(code = code.trim())) {
      return;
    }
    createContext = (ref = vm.Script.createContext) != null ? ref : vm.createContext;
    isContext = (ref1 = vm.isContext) != null ? ref1 : function(ctx) {
      return options.sandbox instanceof createContext().constructor;
    };
    if (createContext) {
      if (options.sandbox != null) {
        if (isContext(options.sandbox)) {
          sandbox = options.sandbox;
        } else {
          sandbox = createContext();
          ref2 = options.sandbox;
          for (k in ref2) {
            if (!hasProp.call(ref2, k)) continue;
            v = ref2[k];
            sandbox[k] = v;
          }
        }
        sandbox.global = sandbox.root = sandbox.GLOBAL = sandbox;
      } else {
        sandbox = global;
      }
      sandbox.__filename = options.filename || 'eval';
      sandbox.__dirname = path.dirname(sandbox.__filename);
      if (!(sandbox !== global || sandbox.module || sandbox.require)) {
        Module = require('module');
        sandbox.module = _module = new Module(options.modulename || 'eval');
        sandbox.require = _require = function(path) {
          return Module._load(path, _module, true);
        };
        _module.filename = sandbox.__filename;
        ref3 = Object.getOwnPropertyNames(require);
        for (i = 0, len = ref3.length; i < len; i++) {
          r = ref3[i];
          if (r !== 'paths' && r !== 'arguments' && r !== 'caller') {
            _require[r] = require[r];
          }
        }
        _require.paths = _module.paths = Module._nodeModulePaths(process.cwd());
        // _require.resolve = function(request) {
        //   return Module._resolveFilename(request, _module);
        // };
      }
    }
    o = {};
    for (k in options) {
      if (!hasProp.call(options, k)) continue;
      v = options[k];
      o[k] = v;
    }
    o.bare = true;
    js = compile(code, o);
    if (sandbox === global) {
      return vm.runInThisContext(js);
    } else {
      return vm.runInContext(js, sandbox);
    }
  };

  exports.register = function() {
    return require('./register');
  };

  if (require.extensions) {
    ref = this.FILE_EXTENSIONS;
    fn1 = function(ext) {
      var base;
      return (base = require.extensions)[ext] != null ? base[ext] : base[ext] = function() {
        throw new Error("Use CoffeeScript.register() or require the coffee-script/register module to require " + ext + " files.");
      };
    };
    for (i = 0, len = ref.length; i < len; i++) {
      ext = ref[i];
      fn1(ext);
    }
  }

  exports._compileFile = function(filename, sourceMap, inlineMap) {
    var answer, err, raw, stripped;
    if (sourceMap == null) {
      sourceMap = false;
    }
    if (inlineMap == null) {
      inlineMap = false;
    }
    raw = fs.readFileSync(filename, 'utf8');
    stripped = raw.charCodeAt(0) === 0xFEFF ? raw.substring(1) : raw;
    try {
      answer = compile(stripped, {
        filename: filename,
        sourceMap: sourceMap,
        inlineMap: inlineMap,
        sourceFiles: [filename],
        literate: helpers.isLiterate(filename)
      });
    } catch (error) {
      err = error;
      throw helpers.updateSyntaxError(err, stripped, filename);
    }
    return answer;
  };

  lexer = new Lexer;

  parser.lexer = {
    lex: function() {
      var tag, token;
      token = parser.tokens[this.pos++];
      if (token) {
        tag = token[0], this.yytext = token[1], this.yylloc = token[2];
        parser.errorToken = token.origin || token;
        this.yylineno = this.yylloc.first_line;
      } else {
        tag = '';
      }
      return tag;
    },
    setInput: function(tokens) {
      parser.tokens = tokens;
      return this.pos = 0;
    },
    upcomingInput: function() {
      return "";
    }
  };

  parser.yy = require('./nodes');

  parser.yy.parseError = function(message, arg) {
    var errorLoc, errorTag, errorText, errorToken, token, tokens;
    token = arg.token;
    errorToken = parser.errorToken, tokens = parser.tokens;
    errorTag = errorToken[0], errorText = errorToken[1], errorLoc = errorToken[2];
    errorText = (function() {
      switch (false) {
        case errorToken !== tokens[tokens.length - 1]:
          return 'end of input';
        case errorTag !== 'INDENT' && errorTag !== 'OUTDENT':
          return 'indentation';
        case errorTag !== 'IDENTIFIER' && errorTag !== 'NUMBER' && errorTag !== 'INFINITY' && errorTag !== 'STRING' && errorTag !== 'STRING_START' && errorTag !== 'REGEX' && errorTag !== 'REGEX_START':
          return errorTag.replace(/_START$/, '').toLowerCase();
        default:
          return helpers.nameWhitespaceCharacter(errorText);
      }
    })();
    return helpers.throwSyntaxError("unexpected " + errorText, errorLoc);
  };

}).call(this);

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"../../package.json":24,"./helpers":16,"./lexer":17,"./nodes":18,"./parser":19,"./register":20,"./sourcemap":23,"_process":40,"buffer":36,"fs":34,"module":34,"path":39,"vm":41}],16:[function(require,module,exports){
(function (process){
// Generated by CoffeeScript 1.12.2
(function() {
  var buildLocationData, extend, flatten, ref, repeat, syntaxErrorToString;

  exports.starts = function(string, literal, start) {
    return literal === string.substr(start, literal.length);
  };

  exports.ends = function(string, literal, back) {
    var len;
    len = literal.length;
    return literal === string.substr(string.length - len - (back || 0), len);
  };

  exports.repeat = repeat = function(str, n) {
    var res;
    res = '';
    while (n > 0) {
      if (n & 1) {
        res += str;
      }
      n >>>= 1;
      str += str;
    }
    return res;
  };

  exports.compact = function(array) {
    var i, item, len1, results;
    results = [];
    for (i = 0, len1 = array.length; i < len1; i++) {
      item = array[i];
      if (item) {
        results.push(item);
      }
    }
    return results;
  };

  exports.count = function(string, substr) {
    var num, pos;
    num = pos = 0;
    if (!substr.length) {
      return 1 / 0;
    }
    while (pos = 1 + string.indexOf(substr, pos)) {
      num++;
    }
    return num;
  };

  exports.merge = function(options, overrides) {
    return extend(extend({}, options), overrides);
  };

  extend = exports.extend = function(object, properties) {
    var key, val;
    for (key in properties) {
      val = properties[key];
      object[key] = val;
    }
    return object;
  };

  exports.flatten = flatten = function(array) {
    var element, flattened, i, len1;
    flattened = [];
    for (i = 0, len1 = array.length; i < len1; i++) {
      element = array[i];
      if ('[object Array]' === Object.prototype.toString.call(element)) {
        flattened = flattened.concat(flatten(element));
      } else {
        flattened.push(element);
      }
    }
    return flattened;
  };

  exports.del = function(obj, key) {
    var val;
    val = obj[key];
    delete obj[key];
    return val;
  };

  exports.some = (ref = Array.prototype.some) != null ? ref : function(fn) {
    var e, i, len1, ref1;
    ref1 = this;
    for (i = 0, len1 = ref1.length; i < len1; i++) {
      e = ref1[i];
      if (fn(e)) {
        return true;
      }
    }
    return false;
  };

  exports.invertLiterate = function(code) {
    var line, lines, maybe_code;
    maybe_code = true;
    lines = (function() {
      var i, len1, ref1, results;
      ref1 = code.split('\n');
      results = [];
      for (i = 0, len1 = ref1.length; i < len1; i++) {
        line = ref1[i];
        if (maybe_code && /^([ ]{4}|[ ]{0,3}\t)/.test(line)) {
          results.push(line);
        } else if (maybe_code = /^\s*$/.test(line)) {
          results.push(line);
        } else {
          results.push('# ' + line);
        }
      }
      return results;
    })();
    return lines.join('\n');
  };

  buildLocationData = function(first, last) {
    if (!last) {
      return first;
    } else {
      return {
        first_line: first.first_line,
        first_column: first.first_column,
        last_line: last.last_line,
        last_column: last.last_column
      };
    }
  };

  exports.addLocationDataFn = function(first, last) {
    return function(obj) {
      if (((typeof obj) === 'object') && (!!obj['updateLocationDataIfMissing'])) {
        obj.updateLocationDataIfMissing(buildLocationData(first, last));
      }
      return obj;
    };
  };

  exports.locationDataToString = function(obj) {
    var locationData;
    if (("2" in obj) && ("first_line" in obj[2])) {
      locationData = obj[2];
    } else if ("first_line" in obj) {
      locationData = obj;
    }
    if (locationData) {
      return ((locationData.first_line + 1) + ":" + (locationData.first_column + 1) + "-") + ((locationData.last_line + 1) + ":" + (locationData.last_column + 1));
    } else {
      return "No location data";
    }
  };

  exports.baseFileName = function(file, stripExt, useWinPathSep) {
    var parts, pathSep;
    if (stripExt == null) {
      stripExt = false;
    }
    if (useWinPathSep == null) {
      useWinPathSep = false;
    }
    pathSep = useWinPathSep ? /\\|\// : /\//;
    parts = file.split(pathSep);
    file = parts[parts.length - 1];
    if (!(stripExt && file.indexOf('.') >= 0)) {
      return file;
    }
    parts = file.split('.');
    parts.pop();
    if (parts[parts.length - 1] === 'coffee' && parts.length > 1) {
      parts.pop();
    }
    return parts.join('.');
  };

  exports.isCoffee = function(file) {
    return /\.((lit)?coffee|coffee\.md)$/.test(file);
  };

  exports.isLiterate = function(file) {
    return /\.(litcoffee|coffee\.md)$/.test(file);
  };

  exports.throwSyntaxError = function(message, location) {
    var error;
    error = new SyntaxError(message);
    error.location = location;
    error.toString = syntaxErrorToString;
    error.stack = error.toString();
    throw error;
  };

  exports.updateSyntaxError = function(error, code, filename) {
    if (error.toString === syntaxErrorToString) {
      error.code || (error.code = code);
      error.filename || (error.filename = filename);
      error.stack = error.toString();
    }
    return error;
  };

  syntaxErrorToString = function() {
    var codeLine, colorize, colorsEnabled, end, filename, first_column, first_line, last_column, last_line, marker, ref1, ref2, ref3, ref4, start;
    if (!(this.code && this.location)) {
      return Error.prototype.toString.call(this);
    }
    ref1 = this.location, first_line = ref1.first_line, first_column = ref1.first_column, last_line = ref1.last_line, last_column = ref1.last_column;
    if (last_line == null) {
      last_line = first_line;
    }
    if (last_column == null) {
      last_column = first_column;
    }
    filename = this.filename || '[stdin]';
    codeLine = this.code.split('\n')[first_line];
    start = first_column;
    end = first_line === last_line ? last_column + 1 : codeLine.length;
    marker = codeLine.slice(0, start).replace(/[^\s]/g, ' ') + repeat('^', end - start);
    if (typeof process !== "undefined" && process !== null) {
      colorsEnabled = ((ref2 = process.stdout) != null ? ref2.isTTY : void 0) && !((ref3 = process.env) != null ? ref3.NODE_DISABLE_COLORS : void 0);
    }
    if ((ref4 = this.colorful) != null ? ref4 : colorsEnabled) {
      colorize = function(str) {
        return "\x1B[1;31m" + str + "\x1B[0m";
      };
      codeLine = codeLine.slice(0, start) + colorize(codeLine.slice(start, end)) + codeLine.slice(end);
      marker = colorize(marker);
    }
    return filename + ":" + (first_line + 1) + ":" + (first_column + 1) + ": error: " + this.message + "\n" + codeLine + "\n" + marker;
  };

  exports.nameWhitespaceCharacter = function(string) {
    switch (string) {
      case ' ':
        return 'space';
      case '\n':
        return 'newline';
      case '\r':
        return 'carriage return';
      case '\t':
        return 'tab';
      default:
        return string;
    }
  };

}).call(this);

}).call(this,require('_process'))
},{"_process":40}],17:[function(require,module,exports){
// Generated by CoffeeScript 1.12.2
(function() {
  var BOM, BOOL, CALLABLE, CODE, COFFEE_ALIASES, COFFEE_ALIAS_MAP, COFFEE_KEYWORDS, COMMENT, COMPARE, COMPOUND_ASSIGN, HERECOMMENT_ILLEGAL, HEREDOC_DOUBLE, HEREDOC_INDENT, HEREDOC_SINGLE, HEREGEX, HEREGEX_OMIT, HERE_JSTOKEN, IDENTIFIER, INDENTABLE_CLOSERS, INDEXABLE, INVALID_ESCAPE, INVERSES, JSTOKEN, JS_KEYWORDS, LEADING_BLANK_LINE, LINE_BREAK, LINE_CONTINUER, Lexer, MATH, MULTI_DENT, NOT_REGEX, NUMBER, OPERATOR, POSSIBLY_DIVISION, REGEX, REGEX_FLAGS, REGEX_ILLEGAL, RELATION, RESERVED, Rewriter, SHIFT, SIMPLE_STRING_OMIT, STRICT_PROSCRIBED, STRING_DOUBLE, STRING_OMIT, STRING_SINGLE, STRING_START, TRAILING_BLANK_LINE, TRAILING_SPACES, UNARY, UNARY_MATH, VALID_FLAGS, WHITESPACE, compact, count, invertLiterate, isForFrom, isUnassignable, key, locationDataToString, ref, ref1, repeat, starts, throwSyntaxError,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    slice = [].slice;

  ref = require('./rewriter'), Rewriter = ref.Rewriter, INVERSES = ref.INVERSES;

  ref1 = require('./helpers'), count = ref1.count, starts = ref1.starts, compact = ref1.compact, repeat = ref1.repeat, invertLiterate = ref1.invertLiterate, locationDataToString = ref1.locationDataToString, throwSyntaxError = ref1.throwSyntaxError;

  exports.Lexer = Lexer = (function() {
    function Lexer() {}

    Lexer.prototype.tokenize = function(code, opts) {
      var consumed, end, i, ref2;
      if (opts == null) {
        opts = {};
      }
      this.literate = opts.literate;
      this.indent = 0;
      this.baseIndent = 0;
      this.indebt = 0;
      this.outdebt = 0;
      this.indents = [];
      this.ends = [];
      this.tokens = [];
      this.seenFor = false;
      this.seenImport = false;
      this.seenExport = false;
      this.exportSpecifierList = false;
      this.chunkLine = opts.line || 0;
      this.chunkColumn = opts.column || 0;
      code = this.clean(code);
      i = 0;
      while (this.chunk = code.slice(i)) {
        consumed = this.identifierToken() || this.commentToken() || this.whitespaceToken() || this.lineToken() || this.stringToken() || this.numberToken() || this.regexToken() || this.jsToken() || this.literalToken();
        ref2 = this.getLineAndColumnFromChunk(consumed), this.chunkLine = ref2[0], this.chunkColumn = ref2[1];
        i += consumed;
        if (opts.untilBalanced && this.ends.length === 0) {
          return {
            tokens: this.tokens,
            index: i
          };
        }
      }
      this.closeIndentation();
      if (end = this.ends.pop()) {
        this.error("missing " + end.tag, end.origin[2]);
      }
      if (opts.rewrite === false) {
        return this.tokens;
      }
      return (new Rewriter).rewrite(this.tokens);
    };

    Lexer.prototype.clean = function(code) {
      if (code.charCodeAt(0) === BOM) {
        code = code.slice(1);
      }
      code = code.replace(/\r/g, '').replace(TRAILING_SPACES, '');
      if (WHITESPACE.test(code)) {
        code = "\n" + code;
        this.chunkLine--;
      }
      if (this.literate) {
        code = invertLiterate(code);
      }
      return code;
    };

    Lexer.prototype.identifierToken = function() {
      var alias, colon, colonOffset, id, idLength, input, match, poppedToken, prev, ref2, ref3, ref4, ref5, ref6, ref7, tag, tagToken;
      if (!(match = IDENTIFIER.exec(this.chunk))) {
        return 0;
      }
      input = match[0], id = match[1], colon = match[2];
      idLength = id.length;
      poppedToken = void 0;
      if (id === 'own' && this.tag() === 'FOR') {
        this.token('OWN', id);
        return id.length;
      }
      if (id === 'from' && this.tag() === 'YIELD') {
        this.token('FROM', id);
        return id.length;
      }
      if (id === 'as' && this.seenImport) {
        if (this.value() === '*') {
          this.tokens[this.tokens.length - 1][0] = 'IMPORT_ALL';
        } else if (ref2 = this.value(), indexOf.call(COFFEE_KEYWORDS, ref2) >= 0) {
          this.tokens[this.tokens.length - 1][0] = 'IDENTIFIER';
        }
        if ((ref3 = this.tag()) === 'DEFAULT' || ref3 === 'IMPORT_ALL' || ref3 === 'IDENTIFIER') {
          this.token('AS', id);
          return id.length;
        }
      }
      if (id === 'as' && this.seenExport && this.tag() === 'IDENTIFIER') {
        this.token('AS', id);
        return id.length;
      }
      if (id === 'default' && this.seenExport) {
        this.token('DEFAULT', id);
        return id.length;
      }
      ref4 = this.tokens, prev = ref4[ref4.length - 1];
      tag = colon || (prev != null) && (((ref5 = prev[0]) === '.' || ref5 === '?.' || ref5 === '::' || ref5 === '?::') || !prev.spaced && prev[0] === '@') ? 'PROPERTY' : 'IDENTIFIER';
      if (tag === 'IDENTIFIER' && (indexOf.call(JS_KEYWORDS, id) >= 0 || indexOf.call(COFFEE_KEYWORDS, id) >= 0) && !(this.exportSpecifierList && indexOf.call(COFFEE_KEYWORDS, id) >= 0)) {
        tag = id.toUpperCase();
        if (tag === 'WHEN' && (ref6 = this.tag(), indexOf.call(LINE_BREAK, ref6) >= 0)) {
          tag = 'LEADING_WHEN';
        } else if (tag === 'FOR') {
          this.seenFor = true;
        } else if (tag === 'UNLESS') {
          tag = 'IF';
        } else if (tag === 'IMPORT') {
          this.seenImport = true;
        } else if (tag === 'EXPORT') {
          this.seenExport = true;
        } else if (indexOf.call(UNARY, tag) >= 0) {
          tag = 'UNARY';
        } else if (indexOf.call(RELATION, tag) >= 0) {
          if (tag !== 'INSTANCEOF' && this.seenFor) {
            tag = 'FOR' + tag;
            this.seenFor = false;
          } else {
            tag = 'RELATION';
            if (this.value() === '!') {
              poppedToken = this.tokens.pop();
              id = '!' + id;
            }
          }
        }
      } else if (tag === 'IDENTIFIER' && this.seenFor && id === 'from' && isForFrom(prev)) {
        tag = 'FORFROM';
        this.seenFor = false;
      }
      if (tag === 'IDENTIFIER' && indexOf.call(RESERVED, id) >= 0) {
        this.error("reserved word '" + id + "'", {
          length: id.length
        });
      }
      if (tag !== 'PROPERTY') {
        if (indexOf.call(COFFEE_ALIASES, id) >= 0) {
          alias = id;
          id = COFFEE_ALIAS_MAP[id];
        }
        tag = (function() {
          switch (id) {
            case '!':
              return 'UNARY';
            case '==':
            case '!=':
              return 'COMPARE';
            case 'true':
            case 'false':
              return 'BOOL';
            case 'break':
            case 'continue':
            case 'debugger':
              return 'STATEMENT';
            case '&&':
            case '||':
              return id;
            default:
              return tag;
          }
        })();
      }
      tagToken = this.token(tag, id, 0, idLength);
      if (alias) {
        tagToken.origin = [tag, alias, tagToken[2]];
      }
      if (poppedToken) {
        ref7 = [poppedToken[2].first_line, poppedToken[2].first_column], tagToken[2].first_line = ref7[0], tagToken[2].first_column = ref7[1];
      }
      if (colon) {
        colonOffset = input.lastIndexOf(':');
        this.token(':', ':', colonOffset, colon.length);
      }
      return input.length;
    };

    Lexer.prototype.numberToken = function() {
      var base, lexedLength, match, number, numberValue, ref2, tag;
      if (!(match = NUMBER.exec(this.chunk))) {
        return 0;
      }
      number = match[0];
      lexedLength = number.length;
      switch (false) {
        case !/^0[BOX]/.test(number):
          this.error("radix prefix in '" + number + "' must be lowercase", {
            offset: 1
          });
          break;
        case !/^(?!0x).*E/.test(number):
          this.error("exponential notation in '" + number + "' must be indicated with a lowercase 'e'", {
            offset: number.indexOf('E')
          });
          break;
        case !/^0\d*[89]/.test(number):
          this.error("decimal literal '" + number + "' must not be prefixed with '0'", {
            length: lexedLength
          });
          break;
        case !/^0\d+/.test(number):
          this.error("octal literal '" + number + "' must be prefixed with '0o'", {
            length: lexedLength
          });
      }
      base = (function() {
        switch (number.charAt(1)) {
          case 'b':
            return 2;
          case 'o':
            return 8;
          case 'x':
            return 16;
          default:
            return null;
        }
      })();
      numberValue = base != null ? parseInt(number.slice(2), base) : parseFloat(number);
      if ((ref2 = number.charAt(1)) === 'b' || ref2 === 'o') {
        number = "0x" + (numberValue.toString(16));
      }
      tag = numberValue === 2e308 ? 'INFINITY' : 'NUMBER';
      this.token(tag, number, 0, lexedLength);
      return lexedLength;
    };

    Lexer.prototype.stringToken = function() {
      var $, attempt, delimiter, doc, end, heredoc, i, indent, indentRegex, match, quote, ref2, ref3, regex, token, tokens;
      quote = (STRING_START.exec(this.chunk) || [])[0];
      if (!quote) {
        return 0;
      }
      if (this.tokens.length && this.value() === 'from' && (this.seenImport || this.seenExport)) {
        this.tokens[this.tokens.length - 1][0] = 'FROM';
      }
      regex = (function() {
        switch (quote) {
          case "'":
            return STRING_SINGLE;
          case '"':
            return STRING_DOUBLE;
          case "'''":
            return HEREDOC_SINGLE;
          case '"""':
            return HEREDOC_DOUBLE;
        }
      })();
      heredoc = quote.length === 3;
      ref2 = this.matchWithInterpolations(regex, quote), tokens = ref2.tokens, end = ref2.index;
      $ = tokens.length - 1;
      delimiter = quote.charAt(0);
      if (heredoc) {
        indent = null;
        doc = ((function() {
          var j, len, results;
          results = [];
          for (i = j = 0, len = tokens.length; j < len; i = ++j) {
            token = tokens[i];
            if (token[0] === 'NEOSTRING') {
              results.push(token[1]);
            }
          }
          return results;
        })()).join('#{}');
        while (match = HEREDOC_INDENT.exec(doc)) {
          attempt = match[1];
          if (indent === null || (0 < (ref3 = attempt.length) && ref3 < indent.length)) {
            indent = attempt;
          }
        }
        if (indent) {
          indentRegex = RegExp("\\n" + indent, "g");
        }
        this.mergeInterpolationTokens(tokens, {
          delimiter: delimiter
        }, (function(_this) {
          return function(value, i) {
            value = _this.formatString(value);
            if (indentRegex) {
              value = value.replace(indentRegex, '\n');
            }
            if (i === 0) {
              value = value.replace(LEADING_BLANK_LINE, '');
            }
            if (i === $) {
              value = value.replace(TRAILING_BLANK_LINE, '');
            }
            return value;
          };
        })(this));
      } else {
        this.mergeInterpolationTokens(tokens, {
          delimiter: delimiter
        }, (function(_this) {
          return function(value, i) {
            value = _this.formatString(value);
            value = value.replace(SIMPLE_STRING_OMIT, function(match, offset) {
              if ((i === 0 && offset === 0) || (i === $ && offset + match.length === value.length)) {
                return '';
              } else {
                return ' ';
              }
            });
            return value;
          };
        })(this));
      }
      return end;
    };

    Lexer.prototype.commentToken = function() {
      var comment, here, match;
      if (!(match = this.chunk.match(COMMENT))) {
        return 0;
      }
      comment = match[0], here = match[1];
      if (here) {
        if (match = HERECOMMENT_ILLEGAL.exec(comment)) {
          this.error("block comments cannot contain " + match[0], {
            offset: match.index,
            length: match[0].length
          });
        }
        if (here.indexOf('\n') >= 0) {
          here = here.replace(RegExp("\\n" + (repeat(' ', this.indent)), "g"), '\n');
        }
        this.token('HERECOMMENT', here, 0, comment.length);
      }
      return comment.length;
    };

    Lexer.prototype.jsToken = function() {
      var match, script;
      if (!(this.chunk.charAt(0) === '`' && (match = HERE_JSTOKEN.exec(this.chunk) || JSTOKEN.exec(this.chunk)))) {
        return 0;
      }
      script = match[1].replace(/\\+(`|$)/g, function(string) {
        return string.slice(-Math.ceil(string.length / 2));
      });
      this.token('JS', script, 0, match[0].length);
      return match[0].length;
    };

    Lexer.prototype.regexToken = function() {
      var body, closed, end, flags, index, match, origin, prev, ref2, ref3, ref4, regex, tokens;
      switch (false) {
        case !(match = REGEX_ILLEGAL.exec(this.chunk)):
          this.error("regular expressions cannot begin with " + match[2], {
            offset: match.index + match[1].length
          });
          break;
        case !(match = this.matchWithInterpolations(HEREGEX, '///')):
          tokens = match.tokens, index = match.index;
          break;
        case !(match = REGEX.exec(this.chunk)):
          regex = match[0], body = match[1], closed = match[2];
          this.validateEscapes(body, {
            isRegex: true,
            offsetInChunk: 1
          });
          index = regex.length;
          ref2 = this.tokens, prev = ref2[ref2.length - 1];
          if (prev) {
            if (prev.spaced && (ref3 = prev[0], indexOf.call(CALLABLE, ref3) >= 0)) {
              if (!closed || POSSIBLY_DIVISION.test(regex)) {
                return 0;
              }
            } else if (ref4 = prev[0], indexOf.call(NOT_REGEX, ref4) >= 0) {
              return 0;
            }
          }
          if (!closed) {
            this.error('missing / (unclosed regex)');
          }
          break;
        default:
          return 0;
      }
      flags = REGEX_FLAGS.exec(this.chunk.slice(index))[0];
      end = index + flags.length;
      origin = this.makeToken('REGEX', null, 0, end);
      switch (false) {
        case !!VALID_FLAGS.test(flags):
          this.error("invalid regular expression flags " + flags, {
            offset: index,
            length: flags.length
          });
          break;
        case !(regex || tokens.length === 1):
          if (body == null) {
            body = this.formatHeregex(tokens[0][1]);
          }
          this.token('REGEX', "" + (this.makeDelimitedLiteral(body, {
            delimiter: '/'
          })) + flags, 0, end, origin);
          break;
        default:
          this.token('REGEX_START', '(', 0, 0, origin);
          this.token('IDENTIFIER', 'RegExp', 0, 0);
          this.token('CALL_START', '(', 0, 0);
          this.mergeInterpolationTokens(tokens, {
            delimiter: '"',
            double: true
          }, this.formatHeregex);
          if (flags) {
            this.token(',', ',', index, 0);
            this.token('STRING', '"' + flags + '"', index, flags.length);
          }
          this.token(')', ')', end, 0);
          this.token('REGEX_END', ')', end, 0);
      }
      return end;
    };

    Lexer.prototype.lineToken = function() {
      var diff, indent, match, noNewlines, size;
      if (!(match = MULTI_DENT.exec(this.chunk))) {
        return 0;
      }
      indent = match[0];
      this.seenFor = false;
      size = indent.length - 1 - indent.lastIndexOf('\n');
      noNewlines = this.unfinished();
      if (size - this.indebt === this.indent) {
        if (noNewlines) {
          this.suppressNewlines();
        } else {
          this.newlineToken(0);
        }
        return indent.length;
      }
      if (size > this.indent) {
        if (noNewlines) {
          this.indebt = size - this.indent;
          this.suppressNewlines();
          return indent.length;
        }
        if (!this.tokens.length) {
          this.baseIndent = this.indent = size;
          return indent.length;
        }
        diff = size - this.indent + this.outdebt;
        this.token('INDENT', diff, indent.length - size, size);
        this.indents.push(diff);
        this.ends.push({
          tag: 'OUTDENT'
        });
        this.outdebt = this.indebt = 0;
        this.indent = size;
      } else if (size < this.baseIndent) {
        this.error('missing indentation', {
          offset: indent.length
        });
      } else {
        this.indebt = 0;
        this.outdentToken(this.indent - size, noNewlines, indent.length);
      }
      return indent.length;
    };

    Lexer.prototype.outdentToken = function(moveOut, noNewlines, outdentLength) {
      var decreasedIndent, dent, lastIndent, ref2;
      decreasedIndent = this.indent - moveOut;
      while (moveOut > 0) {
        lastIndent = this.indents[this.indents.length - 1];
        if (!lastIndent) {
          moveOut = 0;
        } else if (lastIndent === this.outdebt) {
          moveOut -= this.outdebt;
          this.outdebt = 0;
        } else if (lastIndent < this.outdebt) {
          this.outdebt -= lastIndent;
          moveOut -= lastIndent;
        } else {
          dent = this.indents.pop() + this.outdebt;
          if (outdentLength && (ref2 = this.chunk[outdentLength], indexOf.call(INDENTABLE_CLOSERS, ref2) >= 0)) {
            decreasedIndent -= dent - moveOut;
            moveOut = dent;
          }
          this.outdebt = 0;
          this.pair('OUTDENT');
          this.token('OUTDENT', moveOut, 0, outdentLength);
          moveOut -= dent;
        }
      }
      if (dent) {
        this.outdebt -= moveOut;
      }
      while (this.value() === ';') {
        this.tokens.pop();
      }
      if (!(this.tag() === 'TERMINATOR' || noNewlines)) {
        this.token('TERMINATOR', '\n', outdentLength, 0);
      }
      this.indent = decreasedIndent;
      return this;
    };

    Lexer.prototype.whitespaceToken = function() {
      var match, nline, prev, ref2;
      if (!((match = WHITESPACE.exec(this.chunk)) || (nline = this.chunk.charAt(0) === '\n'))) {
        return 0;
      }
      ref2 = this.tokens, prev = ref2[ref2.length - 1];
      if (prev) {
        prev[match ? 'spaced' : 'newLine'] = true;
      }
      if (match) {
        return match[0].length;
      } else {
        return 0;
      }
    };

    Lexer.prototype.newlineToken = function(offset) {
      while (this.value() === ';') {
        this.tokens.pop();
      }
      if (this.tag() !== 'TERMINATOR') {
        this.token('TERMINATOR', '\n', offset, 0);
      }
      return this;
    };

    Lexer.prototype.suppressNewlines = function() {
      if (this.value() === '\\') {
        this.tokens.pop();
      }
      return this;
    };

    Lexer.prototype.literalToken = function() {
      var match, message, origin, prev, ref2, ref3, ref4, ref5, ref6, skipToken, tag, token, value;
      if (match = OPERATOR.exec(this.chunk)) {
        value = match[0];
        if (CODE.test(value)) {
          this.tagParameters();
        }
      } else {
        value = this.chunk.charAt(0);
      }
      tag = value;
      ref2 = this.tokens, prev = ref2[ref2.length - 1];
      if (prev && indexOf.call(['='].concat(slice.call(COMPOUND_ASSIGN)), value) >= 0) {
        skipToken = false;
        if (value === '=' && ((ref3 = prev[1]) === '||' || ref3 === '&&') && !prev.spaced) {
          prev[0] = 'COMPOUND_ASSIGN';
          prev[1] += '=';
          prev = this.tokens[this.tokens.length - 2];
          skipToken = true;
        }
        if (prev && prev[0] !== 'PROPERTY') {
          origin = (ref4 = prev.origin) != null ? ref4 : prev;
          message = isUnassignable(prev[1], origin[1]);
          if (message) {
            this.error(message, origin[2]);
          }
        }
        if (skipToken) {
          return value.length;
        }
      }
      if (value === '{' && (prev != null ? prev[0] : void 0) === 'EXPORT') {
        this.exportSpecifierList = true;
      } else if (this.exportSpecifierList && value === '}') {
        this.exportSpecifierList = false;
      }
      if (value === ';') {
        this.seenFor = this.seenImport = this.seenExport = false;
        tag = 'TERMINATOR';
      } else if (value === '*' && prev[0] === 'EXPORT') {
        tag = 'EXPORT_ALL';
      } else if (indexOf.call(MATH, value) >= 0) {
        tag = 'MATH';
      } else if (indexOf.call(COMPARE, value) >= 0) {
        tag = 'COMPARE';
      } else if (indexOf.call(COMPOUND_ASSIGN, value) >= 0) {
        tag = 'COMPOUND_ASSIGN';
      } else if (indexOf.call(UNARY, value) >= 0) {
        tag = 'UNARY';
      } else if (indexOf.call(UNARY_MATH, value) >= 0) {
        tag = 'UNARY_MATH';
      } else if (indexOf.call(SHIFT, value) >= 0) {
        tag = 'SHIFT';
      } else if (value === '?' && (prev != null ? prev.spaced : void 0)) {
        tag = 'BIN?';
      } else if (prev && !prev.spaced) {
        if (value === '(' && (ref5 = prev[0], indexOf.call(CALLABLE, ref5) >= 0)) {
          if (prev[0] === '?') {
            prev[0] = 'FUNC_EXIST';
          }
          tag = 'CALL_START';
        } else if (value === '[' && (ref6 = prev[0], indexOf.call(INDEXABLE, ref6) >= 0)) {
          tag = 'INDEX_START';
          switch (prev[0]) {
            case '?':
              prev[0] = 'INDEX_SOAK';
          }
        }
      }
      token = this.makeToken(tag, value);
      switch (value) {
        case '(':
        case '{':
        case '[':
          this.ends.push({
            tag: INVERSES[value],
            origin: token
          });
          break;
        case ')':
        case '}':
        case ']':
          this.pair(value);
      }
      this.tokens.push(token);
      return value.length;
    };

    Lexer.prototype.tagParameters = function() {
      var i, stack, tok, tokens;
      if (this.tag() !== ')') {
        return this;
      }
      stack = [];
      tokens = this.tokens;
      i = tokens.length;
      tokens[--i][0] = 'PARAM_END';
      while (tok = tokens[--i]) {
        switch (tok[0]) {
          case ')':
            stack.push(tok);
            break;
          case '(':
          case 'CALL_START':
            if (stack.length) {
              stack.pop();
            } else if (tok[0] === '(') {
              tok[0] = 'PARAM_START';
              return this;
            } else {
              return this;
            }
        }
      }
      return this;
    };

    Lexer.prototype.closeIndentation = function() {
      return this.outdentToken(this.indent);
    };

    Lexer.prototype.matchWithInterpolations = function(regex, delimiter) {
      var close, column, firstToken, index, lastToken, line, nested, offsetInChunk, open, ref2, ref3, ref4, str, strPart, tokens;
      tokens = [];
      offsetInChunk = delimiter.length;
      if (this.chunk.slice(0, offsetInChunk) !== delimiter) {
        return null;
      }
      str = this.chunk.slice(offsetInChunk);
      while (true) {
        strPart = regex.exec(str)[0];
        this.validateEscapes(strPart, {
          isRegex: delimiter.charAt(0) === '/',
          offsetInChunk: offsetInChunk
        });
        tokens.push(this.makeToken('NEOSTRING', strPart, offsetInChunk));
        str = str.slice(strPart.length);
        offsetInChunk += strPart.length;
        if (str.slice(0, 2) !== '#{') {
          break;
        }
        ref2 = this.getLineAndColumnFromChunk(offsetInChunk + 1), line = ref2[0], column = ref2[1];
        ref3 = new Lexer().tokenize(str.slice(1), {
          line: line,
          column: column,
          untilBalanced: true
        }), nested = ref3.tokens, index = ref3.index;
        index += 1;
        open = nested[0], close = nested[nested.length - 1];
        open[0] = open[1] = '(';
        close[0] = close[1] = ')';
        close.origin = ['', 'end of interpolation', close[2]];
        if (((ref4 = nested[1]) != null ? ref4[0] : void 0) === 'TERMINATOR') {
          nested.splice(1, 1);
        }
        tokens.push(['TOKENS', nested]);
        str = str.slice(index);
        offsetInChunk += index;
      }
      if (str.slice(0, delimiter.length) !== delimiter) {
        this.error("missing " + delimiter, {
          length: delimiter.length
        });
      }
      firstToken = tokens[0], lastToken = tokens[tokens.length - 1];
      firstToken[2].first_column -= delimiter.length;
      if (lastToken[1].substr(-1) === '\n') {
        lastToken[2].last_line += 1;
        lastToken[2].last_column = delimiter.length - 1;
      } else {
        lastToken[2].last_column += delimiter.length;
      }
      if (lastToken[1].length === 0) {
        lastToken[2].last_column -= 1;
      }
      return {
        tokens: tokens,
        index: offsetInChunk + delimiter.length
      };
    };

    Lexer.prototype.mergeInterpolationTokens = function(tokens, options, fn) {
      var converted, firstEmptyStringIndex, firstIndex, i, j, lastToken, len, locationToken, lparen, plusToken, ref2, rparen, tag, token, tokensToPush, value;
      if (tokens.length > 1) {
        lparen = this.token('STRING_START', '(', 0, 0);
      }
      firstIndex = this.tokens.length;
      for (i = j = 0, len = tokens.length; j < len; i = ++j) {
        token = tokens[i];
        tag = token[0], value = token[1];
        switch (tag) {
          case 'TOKENS':
            if (value.length === 2) {
              continue;
            }
            locationToken = value[0];
            tokensToPush = value;
            break;
          case 'NEOSTRING':
            converted = fn(token[1], i);
            if (converted.length === 0) {
              if (i === 0) {
                firstEmptyStringIndex = this.tokens.length;
              } else {
                continue;
              }
            }
            if (i === 2 && (firstEmptyStringIndex != null)) {
              this.tokens.splice(firstEmptyStringIndex, 2);
            }
            token[0] = 'STRING';
            token[1] = this.makeDelimitedLiteral(converted, options);
            locationToken = token;
            tokensToPush = [token];
        }
        if (this.tokens.length > firstIndex) {
          plusToken = this.token('+', '+');
          plusToken[2] = {
            first_line: locationToken[2].first_line,
            first_column: locationToken[2].first_column,
            last_line: locationToken[2].first_line,
            last_column: locationToken[2].first_column
          };
        }
        (ref2 = this.tokens).push.apply(ref2, tokensToPush);
      }
      if (lparen) {
        lastToken = tokens[tokens.length - 1];
        lparen.origin = [
          'STRING', null, {
            first_line: lparen[2].first_line,
            first_column: lparen[2].first_column,
            last_line: lastToken[2].last_line,
            last_column: lastToken[2].last_column
          }
        ];
        rparen = this.token('STRING_END', ')');
        return rparen[2] = {
          first_line: lastToken[2].last_line,
          first_column: lastToken[2].last_column,
          last_line: lastToken[2].last_line,
          last_column: lastToken[2].last_column
        };
      }
    };

    Lexer.prototype.pair = function(tag) {
      var lastIndent, prev, ref2, ref3, wanted;
      ref2 = this.ends, prev = ref2[ref2.length - 1];
      if (tag !== (wanted = prev != null ? prev.tag : void 0)) {
        if ('OUTDENT' !== wanted) {
          this.error("unmatched " + tag);
        }
        ref3 = this.indents, lastIndent = ref3[ref3.length - 1];
        this.outdentToken(lastIndent, true);
        return this.pair(tag);
      }
      return this.ends.pop();
    };

    Lexer.prototype.getLineAndColumnFromChunk = function(offset) {
      var column, lastLine, lineCount, ref2, string;
      if (offset === 0) {
        return [this.chunkLine, this.chunkColumn];
      }
      if (offset >= this.chunk.length) {
        string = this.chunk;
      } else {
        string = this.chunk.slice(0, +(offset - 1) + 1 || 9e9);
      }
      lineCount = count(string, '\n');
      column = this.chunkColumn;
      if (lineCount > 0) {
        ref2 = string.split('\n'), lastLine = ref2[ref2.length - 1];
        column = lastLine.length;
      } else {
        column += string.length;
      }
      return [this.chunkLine + lineCount, column];
    };

    Lexer.prototype.makeToken = function(tag, value, offsetInChunk, length) {
      var lastCharacter, locationData, ref2, ref3, token;
      if (offsetInChunk == null) {
        offsetInChunk = 0;
      }
      if (length == null) {
        length = value.length;
      }
      locationData = {};
      ref2 = this.getLineAndColumnFromChunk(offsetInChunk), locationData.first_line = ref2[0], locationData.first_column = ref2[1];
      lastCharacter = length > 0 ? length - 1 : 0;
      ref3 = this.getLineAndColumnFromChunk(offsetInChunk + lastCharacter), locationData.last_line = ref3[0], locationData.last_column = ref3[1];
      token = [tag, value, locationData];
      return token;
    };

    Lexer.prototype.token = function(tag, value, offsetInChunk, length, origin) {
      var token;
      token = this.makeToken(tag, value, offsetInChunk, length);
      if (origin) {
        token.origin = origin;
      }
      this.tokens.push(token);
      return token;
    };

    Lexer.prototype.tag = function() {
      var ref2, token;
      ref2 = this.tokens, token = ref2[ref2.length - 1];
      return token != null ? token[0] : void 0;
    };

    Lexer.prototype.value = function() {
      var ref2, token;
      ref2 = this.tokens, token = ref2[ref2.length - 1];
      return token != null ? token[1] : void 0;
    };

    Lexer.prototype.unfinished = function() {
      var ref2;
      return LINE_CONTINUER.test(this.chunk) || ((ref2 = this.tag()) === '\\' || ref2 === '.' || ref2 === '?.' || ref2 === '?::' || ref2 === 'UNARY' || ref2 === 'MATH' || ref2 === 'UNARY_MATH' || ref2 === '+' || ref2 === '-' || ref2 === '**' || ref2 === 'SHIFT' || ref2 === 'RELATION' || ref2 === 'COMPARE' || ref2 === '&' || ref2 === '^' || ref2 === '|' || ref2 === '&&' || ref2 === '||' || ref2 === 'BIN?' || ref2 === 'THROW' || ref2 === 'EXTENDS');
    };

    Lexer.prototype.formatString = function(str) {
      return str.replace(STRING_OMIT, '$1');
    };

    Lexer.prototype.formatHeregex = function(str) {
      return str.replace(HEREGEX_OMIT, '$1$2');
    };

    Lexer.prototype.validateEscapes = function(str, options) {
      var before, hex, invalidEscape, match, message, octal, ref2, unicode;
      if (options == null) {
        options = {};
      }
      match = INVALID_ESCAPE.exec(str);
      if (!match) {
        return;
      }
      match[0], before = match[1], octal = match[2], hex = match[3], unicode = match[4];
      if (options.isRegex && octal && octal.charAt(0) !== '0') {
        return;
      }
      message = octal ? "octal escape sequences are not allowed" : "invalid escape sequence";
      invalidEscape = "\\" + (octal || hex || unicode);
      return this.error(message + " " + invalidEscape, {
        offset: ((ref2 = options.offsetInChunk) != null ? ref2 : 0) + match.index + before.length,
        length: invalidEscape.length
      });
    };

    Lexer.prototype.makeDelimitedLiteral = function(body, options) {
      var regex;
      if (options == null) {
        options = {};
      }
      if (body === '' && options.delimiter === '/') {
        body = '(?:)';
      }
      regex = RegExp("(\\\\\\\\)|(\\\\0(?=[1-7]))|\\\\?(" + options.delimiter + ")|\\\\?(?:(\\n)|(\\r)|(\\u2028)|(\\u2029))|(\\\\.)", "g");
      body = body.replace(regex, function(match, backslash, nul, delimiter, lf, cr, ls, ps, other) {
        switch (false) {
          case !backslash:
            if (options.double) {
              return backslash + backslash;
            } else {
              return backslash;
            }
          case !nul:
            return '\\x00';
          case !delimiter:
            return "\\" + delimiter;
          case !lf:
            return '\\n';
          case !cr:
            return '\\r';
          case !ls:
            return '\\u2028';
          case !ps:
            return '\\u2029';
          case !other:
            if (options.double) {
              return "\\" + other;
            } else {
              return other;
            }
        }
      });
      return "" + options.delimiter + body + options.delimiter;
    };

    Lexer.prototype.error = function(message, options) {
      var first_column, first_line, location, ref2, ref3, ref4;
      if (options == null) {
        options = {};
      }
      location = 'first_line' in options ? options : ((ref3 = this.getLineAndColumnFromChunk((ref2 = options.offset) != null ? ref2 : 0), first_line = ref3[0], first_column = ref3[1], ref3), {
        first_line: first_line,
        first_column: first_column,
        last_column: first_column + ((ref4 = options.length) != null ? ref4 : 1) - 1
      });
      return throwSyntaxError(message, location);
    };

    return Lexer;

  })();

  isUnassignable = function(name, displayName) {
    if (displayName == null) {
      displayName = name;
    }
    switch (false) {
      case indexOf.call(slice.call(JS_KEYWORDS).concat(slice.call(COFFEE_KEYWORDS)), name) < 0:
        return "keyword '" + displayName + "' can't be assigned";
      case indexOf.call(STRICT_PROSCRIBED, name) < 0:
        return "'" + displayName + "' can't be assigned";
      case indexOf.call(RESERVED, name) < 0:
        return "reserved word '" + displayName + "' can't be assigned";
      default:
        return false;
    }
  };

  exports.isUnassignable = isUnassignable;

  isForFrom = function(prev) {
    var ref2;
    if (prev[0] === 'IDENTIFIER') {
      if (prev[1] === 'from') {
        prev[1][0] = 'IDENTIFIER';
        true;
      }
      return true;
    } else if (prev[0] === 'FOR') {
      return false;
    } else if ((ref2 = prev[1]) === '{' || ref2 === '[' || ref2 === ',' || ref2 === ':') {
      return false;
    } else {
      return true;
    }
  };

  JS_KEYWORDS = ['true', 'false', 'null', 'this', 'new', 'delete', 'typeof', 'in', 'instanceof', 'return', 'throw', 'break', 'continue', 'debugger', 'yield', 'if', 'else', 'switch', 'for', 'while', 'do', 'try', 'catch', 'finally', 'class', 'extends', 'super', 'import', 'export', 'default'];

  COFFEE_KEYWORDS = ['undefined', 'Infinity', 'NaN', 'then', 'unless', 'until', 'loop', 'of', 'by', 'when'];

  COFFEE_ALIAS_MAP = {
    and: '&&',
    or: '||',
    is: '==',
    isnt: '!=',
    not: '!',
    yes: 'true',
    no: 'false',
    on: 'true',
    off: 'false'
  };

  COFFEE_ALIASES = (function() {
    var results;
    results = [];
    for (key in COFFEE_ALIAS_MAP) {
      results.push(key);
    }
    return results;
  })();

  COFFEE_KEYWORDS = COFFEE_KEYWORDS.concat(COFFEE_ALIASES);

  RESERVED = ['case', 'function', 'var', 'void', 'with', 'const', 'let', 'enum', 'native', 'implements', 'interface', 'package', 'private', 'protected', 'public', 'static'];

  STRICT_PROSCRIBED = ['arguments', 'eval'];

  exports.JS_FORBIDDEN = JS_KEYWORDS.concat(RESERVED).concat(STRICT_PROSCRIBED);

  BOM = 65279;

  IDENTIFIER = /^(?!\d)((?:(?!\s)[$\w\x7f-\uffff])+)([^\n\S]*:(?!:))?/;

  NUMBER = /^0b[01]+|^0o[0-7]+|^0x[\da-f]+|^\d*\.?\d+(?:e[+-]?\d+)?/i;

  OPERATOR = /^(?:[-=]>|[-+*\/%<>&|^!?=]=|>>>=?|([-+:])\1|([&|<>*\/%])\2=?|\?(\.|::)|\.{2,3})/;

  WHITESPACE = /^[^\n\S]+/;

  COMMENT = /^###([^#][\s\S]*?)(?:###[^\n\S]*|###$)|^(?:\s*#(?!##[^#]).*)+/;

  CODE = /^[-=]>/;

  MULTI_DENT = /^(?:\n[^\n\S]*)+/;

  JSTOKEN = /^`(?!``)((?:[^`\\]|\\[\s\S])*)`/;

  HERE_JSTOKEN = /^```((?:[^`\\]|\\[\s\S]|`(?!``))*)```/;

  STRING_START = /^(?:'''|"""|'|")/;

  STRING_SINGLE = /^(?:[^\\']|\\[\s\S])*/;

  STRING_DOUBLE = /^(?:[^\\"#]|\\[\s\S]|\#(?!\{))*/;

  HEREDOC_SINGLE = /^(?:[^\\']|\\[\s\S]|'(?!''))*/;

  HEREDOC_DOUBLE = /^(?:[^\\"#]|\\[\s\S]|"(?!"")|\#(?!\{))*/;

  STRING_OMIT = /((?:\\\\)+)|\\[^\S\n]*\n\s*/g;

  SIMPLE_STRING_OMIT = /\s*\n\s*/g;

  HEREDOC_INDENT = /\n+([^\n\S]*)(?=\S)/g;

  REGEX = /^\/(?!\/)((?:[^[\/\n\\]|\\[^\n]|\[(?:\\[^\n]|[^\]\n\\])*\])*)(\/)?/;

  REGEX_FLAGS = /^\w*/;

  VALID_FLAGS = /^(?!.*(.).*\1)[imgy]*$/;

  HEREGEX = /^(?:[^\\\/#]|\\[\s\S]|\/(?!\/\/)|\#(?!\{))*/;

  HEREGEX_OMIT = /((?:\\\\)+)|\\(\s)|\s+(?:#.*)?/g;

  REGEX_ILLEGAL = /^(\/|\/{3}\s*)(\*)/;

  POSSIBLY_DIVISION = /^\/=?\s/;

  HERECOMMENT_ILLEGAL = /\*\//;

  LINE_CONTINUER = /^\s*(?:,|\??\.(?![.\d])|::)/;

  INVALID_ESCAPE = /((?:^|[^\\])(?:\\\\)*)\\(?:(0[0-7]|[1-7])|(x(?![\da-fA-F]{2}).{0,2})|(u(?![\da-fA-F]{4}).{0,4}))/;

  LEADING_BLANK_LINE = /^[^\n\S]*\n/;

  TRAILING_BLANK_LINE = /\n[^\n\S]*$/;

  TRAILING_SPACES = /\s+$/;

  COMPOUND_ASSIGN = ['-=', '+=', '/=', '*=', '%=', '||=', '&&=', '?=', '<<=', '>>=', '>>>=', '&=', '^=', '|=', '**=', '//=', '%%='];

  UNARY = ['NEW', 'TYPEOF', 'DELETE', 'DO'];

  UNARY_MATH = ['!', '~'];

  SHIFT = ['<<', '>>', '>>>'];

  COMPARE = ['==', '!=', '<', '>', '<=', '>='];

  MATH = ['*', '/', '%', '//', '%%'];

  RELATION = ['IN', 'OF', 'INSTANCEOF'];

  BOOL = ['TRUE', 'FALSE'];

  CALLABLE = ['IDENTIFIER', 'PROPERTY', ')', ']', '?', '@', 'THIS', 'SUPER'];

  INDEXABLE = CALLABLE.concat(['NUMBER', 'INFINITY', 'NAN', 'STRING', 'STRING_END', 'REGEX', 'REGEX_END', 'BOOL', 'NULL', 'UNDEFINED', '}', '::']);

  NOT_REGEX = INDEXABLE.concat(['++', '--']);

  LINE_BREAK = ['INDENT', 'OUTDENT', 'TERMINATOR'];

  INDENTABLE_CLOSERS = [')', '}', ']'];

}).call(this);

},{"./helpers":16,"./rewriter":21}],18:[function(require,module,exports){
// Generated by CoffeeScript 1.12.2
(function() {
  var Access, Arr, Assign, Base, Block, BooleanLiteral, Call, Class, Code, CodeFragment, Comment, Existence, Expansion, ExportAllDeclaration, ExportDeclaration, ExportDefaultDeclaration, ExportNamedDeclaration, ExportSpecifier, ExportSpecifierList, Extends, For, IdentifierLiteral, If, ImportClause, ImportDeclaration, ImportDefaultSpecifier, ImportNamespaceSpecifier, ImportSpecifier, ImportSpecifierList, In, Index, InfinityLiteral, JS_FORBIDDEN, LEVEL_ACCESS, LEVEL_COND, LEVEL_LIST, LEVEL_OP, LEVEL_PAREN, LEVEL_TOP, Literal, ModuleDeclaration, ModuleSpecifier, ModuleSpecifierList, NEGATE, NO, NaNLiteral, NullLiteral, NumberLiteral, Obj, Op, Param, Parens, PassthroughLiteral, PropertyName, Range, RegexLiteral, RegexWithInterpolations, Return, SIMPLENUM, Scope, Slice, Splat, StatementLiteral, StringLiteral, StringWithInterpolations, SuperCall, Switch, TAB, THIS, TaggedTemplateCall, ThisLiteral, Throw, Try, UTILITIES, UndefinedLiteral, Value, While, YES, YieldReturn, addLocationDataFn, compact, del, ends, extend, flatten, fragmentsToText, isComplexOrAssignable, isLiteralArguments, isLiteralThis, isUnassignable, locationDataToString, merge, multident, ref1, ref2, some, starts, throwSyntaxError, unfoldSoak, utility,
    extend1 = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    slice = [].slice;

  Error.stackTraceLimit = 2e308;

  Scope = require('./scope').Scope;

  ref1 = require('./lexer'), isUnassignable = ref1.isUnassignable, JS_FORBIDDEN = ref1.JS_FORBIDDEN;

  ref2 = require('./helpers'), compact = ref2.compact, flatten = ref2.flatten, extend = ref2.extend, merge = ref2.merge, del = ref2.del, starts = ref2.starts, ends = ref2.ends, some = ref2.some, addLocationDataFn = ref2.addLocationDataFn, locationDataToString = ref2.locationDataToString, throwSyntaxError = ref2.throwSyntaxError;

  exports.extend = extend;

  exports.addLocationDataFn = addLocationDataFn;

  YES = function() {
    return true;
  };

  NO = function() {
    return false;
  };

  THIS = function() {
    return this;
  };

  NEGATE = function() {
    this.negated = !this.negated;
    return this;
  };

  exports.CodeFragment = CodeFragment = (function() {
    function CodeFragment(parent, code) {
      var ref3;
      this.code = "" + code;
      this.locationData = parent != null ? parent.locationData : void 0;
      this.type = (parent != null ? (ref3 = parent.constructor) != null ? ref3.name : void 0 : void 0) || 'unknown';
    }

    CodeFragment.prototype.toString = function() {
      return "" + this.code + (this.locationData ? ": " + locationDataToString(this.locationData) : '');
    };

    return CodeFragment;

  })();

  fragmentsToText = function(fragments) {
    var fragment;
    return ((function() {
      var j, len1, results;
      results = [];
      for (j = 0, len1 = fragments.length; j < len1; j++) {
        fragment = fragments[j];
        results.push(fragment.code);
      }
      return results;
    })()).join('');
  };

  exports.Base = Base = (function() {
    function Base() {}

    Base.prototype.compile = function(o, lvl) {
      return fragmentsToText(this.compileToFragments(o, lvl));
    };

    Base.prototype.compileToFragments = function(o, lvl) {
      var node;
      o = extend({}, o);
      if (lvl) {
        o.level = lvl;
      }
      node = this.unfoldSoak(o) || this;
      node.tab = o.indent;
      if (o.level === LEVEL_TOP || !node.isStatement(o)) {
        return node.compileNode(o);
      } else {
        return node.compileClosure(o);
      }
    };

    Base.prototype.compileClosure = function(o) {
      var args, argumentsNode, func, jumpNode, meth, parts, ref3;
      if (jumpNode = this.jumps()) {
        jumpNode.error('cannot use a pure statement in an expression');
      }
      o.sharedScope = true;
      func = new Code([], Block.wrap([this]));
      args = [];
      if ((argumentsNode = this.contains(isLiteralArguments)) || this.contains(isLiteralThis)) {
        args = [new ThisLiteral];
        if (argumentsNode) {
          meth = 'apply';
          args.push(new IdentifierLiteral('arguments'));
        } else {
          meth = 'call';
        }
        func = new Value(func, [new Access(new PropertyName(meth))]);
      }
      parts = (new Call(func, args)).compileNode(o);
      if (func.isGenerator || ((ref3 = func.base) != null ? ref3.isGenerator : void 0)) {
        parts.unshift(this.makeCode("(yield* "));
        parts.push(this.makeCode(")"));
      }
      return parts;
    };

    Base.prototype.cache = function(o, level, isComplex) {
      var complex, ref, sub;
      complex = isComplex != null ? isComplex(this) : this.isComplex();
      if (complex) {
        ref = new IdentifierLiteral(o.scope.freeVariable('ref'));
        sub = new Assign(ref, this);
        if (level) {
          return [sub.compileToFragments(o, level), [this.makeCode(ref.value)]];
        } else {
          return [sub, ref];
        }
      } else {
        ref = level ? this.compileToFragments(o, level) : this;
        return [ref, ref];
      }
    };

    Base.prototype.cacheToCodeFragments = function(cacheValues) {
      return [fragmentsToText(cacheValues[0]), fragmentsToText(cacheValues[1])];
    };

    Base.prototype.makeReturn = function(res) {
      var me;
      me = this.unwrapAll();
      if (res) {
        return new Call(new Literal(res + ".push"), [me]);
      } else {
        return new Return(me);
      }
    };

    Base.prototype.contains = function(pred) {
      var node;
      node = void 0;
      this.traverseChildren(false, function(n) {
        if (pred(n)) {
          node = n;
          return false;
        }
      });
      return node;
    };

    Base.prototype.lastNonComment = function(list) {
      var i;
      i = list.length;
      while (i--) {
        if (!(list[i] instanceof Comment)) {
          return list[i];
        }
      }
      return null;
    };

    Base.prototype.toString = function(idt, name) {
      var tree;
      if (idt == null) {
        idt = '';
      }
      if (name == null) {
        name = this.constructor.name;
      }
      tree = '\n' + idt + name;
      if (this.soak) {
        tree += '?';
      }
      this.eachChild(function(node) {
        return tree += node.toString(idt + TAB);
      });
      return tree;
    };

    Base.prototype.eachChild = function(func) {
      var attr, child, j, k, len1, len2, ref3, ref4;
      if (!this.children) {
        return this;
      }
      ref3 = this.children;
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        attr = ref3[j];
        if (this[attr]) {
          ref4 = flatten([this[attr]]);
          for (k = 0, len2 = ref4.length; k < len2; k++) {
            child = ref4[k];
            if (func(child) === false) {
              return this;
            }
          }
        }
      }
      return this;
    };

    Base.prototype.traverseChildren = function(crossScope, func) {
      return this.eachChild(function(child) {
        var recur;
        recur = func(child);
        if (recur !== false) {
          return child.traverseChildren(crossScope, func);
        }
      });
    };

    Base.prototype.invert = function() {
      return new Op('!', this);
    };

    Base.prototype.unwrapAll = function() {
      var node;
      node = this;
      while (node !== (node = node.unwrap())) {
        continue;
      }
      return node;
    };

    Base.prototype.children = [];

    Base.prototype.isStatement = NO;

    Base.prototype.jumps = NO;

    Base.prototype.isComplex = YES;

    Base.prototype.isChainable = NO;

    Base.prototype.isAssignable = NO;

    Base.prototype.isNumber = NO;

    Base.prototype.unwrap = THIS;

    Base.prototype.unfoldSoak = NO;

    Base.prototype.assigns = NO;

    Base.prototype.updateLocationDataIfMissing = function(locationData) {
      if (this.locationData) {
        return this;
      }
      this.locationData = locationData;
      return this.eachChild(function(child) {
        return child.updateLocationDataIfMissing(locationData);
      });
    };

    Base.prototype.error = function(message) {
      return throwSyntaxError(message, this.locationData);
    };

    Base.prototype.makeCode = function(code) {
      return new CodeFragment(this, code);
    };

    Base.prototype.wrapInBraces = function(fragments) {
      return [].concat(this.makeCode('('), fragments, this.makeCode(')'));
    };

    Base.prototype.joinFragmentArrays = function(fragmentsList, joinStr) {
      var answer, fragments, i, j, len1;
      answer = [];
      for (i = j = 0, len1 = fragmentsList.length; j < len1; i = ++j) {
        fragments = fragmentsList[i];
        if (i) {
          answer.push(this.makeCode(joinStr));
        }
        answer = answer.concat(fragments);
      }
      return answer;
    };

    return Base;

  })();

  exports.Block = Block = (function(superClass1) {
    extend1(Block, superClass1);

    function Block(nodes) {
      this.expressions = compact(flatten(nodes || []));
    }

    Block.prototype.children = ['expressions'];

    Block.prototype.push = function(node) {
      this.expressions.push(node);
      return this;
    };

    Block.prototype.pop = function() {
      return this.expressions.pop();
    };

    Block.prototype.unshift = function(node) {
      this.expressions.unshift(node);
      return this;
    };

    Block.prototype.unwrap = function() {
      if (this.expressions.length === 1) {
        return this.expressions[0];
      } else {
        return this;
      }
    };

    Block.prototype.isEmpty = function() {
      return !this.expressions.length;
    };

    Block.prototype.isStatement = function(o) {
      var exp, j, len1, ref3;
      ref3 = this.expressions;
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        exp = ref3[j];
        if (exp.isStatement(o)) {
          return true;
        }
      }
      return false;
    };

    Block.prototype.jumps = function(o) {
      var exp, j, jumpNode, len1, ref3;
      ref3 = this.expressions;
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        exp = ref3[j];
        if (jumpNode = exp.jumps(o)) {
          return jumpNode;
        }
      }
    };

    Block.prototype.makeReturn = function(res) {
      var expr, len;
      len = this.expressions.length;
      while (len--) {
        expr = this.expressions[len];
        if (!(expr instanceof Comment)) {
          this.expressions[len] = expr.makeReturn(res);
          if (expr instanceof Return && !expr.expression) {
            this.expressions.splice(len, 1);
          }
          break;
        }
      }
      return this;
    };

    Block.prototype.compileToFragments = function(o, level) {
      if (o == null) {
        o = {};
      }
      if (o.scope) {
        return Block.__super__.compileToFragments.call(this, o, level);
      } else {
        return this.compileRoot(o);
      }
    };

    Block.prototype.compileNode = function(o) {
      var answer, compiledNodes, fragments, index, j, len1, node, ref3, top;
      this.tab = o.indent;
      top = o.level === LEVEL_TOP;
      compiledNodes = [];
      ref3 = this.expressions;
      for (index = j = 0, len1 = ref3.length; j < len1; index = ++j) {
        node = ref3[index];
        node = node.unwrapAll();
        node = node.unfoldSoak(o) || node;
        if (node instanceof Block) {
          compiledNodes.push(node.compileNode(o));
        } else if (top) {
          node.front = true;
          fragments = node.compileToFragments(o);
          if (!node.isStatement(o)) {
            fragments.unshift(this.makeCode("" + this.tab));
            fragments.push(this.makeCode(";"));
          }
          compiledNodes.push(fragments);
        } else {
          compiledNodes.push(node.compileToFragments(o, LEVEL_LIST));
        }
      }
      if (top) {
        if (this.spaced) {
          return [].concat(this.joinFragmentArrays(compiledNodes, '\n\n'), this.makeCode("\n"));
        } else {
          return this.joinFragmentArrays(compiledNodes, '\n');
        }
      }
      if (compiledNodes.length) {
        answer = this.joinFragmentArrays(compiledNodes, ', ');
      } else {
        answer = [this.makeCode("void 0")];
      }
      if (compiledNodes.length > 1 && o.level >= LEVEL_LIST) {
        return this.wrapInBraces(answer);
      } else {
        return answer;
      }
    };

    Block.prototype.compileRoot = function(o) {
      var exp, fragments, i, j, len1, name, prelude, preludeExps, ref3, ref4, rest;
      o.indent = o.bare ? '' : TAB;
      o.level = LEVEL_TOP;
      this.spaced = true;
      o.scope = new Scope(null, this, null, (ref3 = o.referencedVars) != null ? ref3 : []);
      ref4 = o.locals || [];
      for (j = 0, len1 = ref4.length; j < len1; j++) {
        name = ref4[j];
        o.scope.parameter(name);
      }
      prelude = [];
      if (!o.bare) {
        preludeExps = (function() {
          var k, len2, ref5, results;
          ref5 = this.expressions;
          results = [];
          for (i = k = 0, len2 = ref5.length; k < len2; i = ++k) {
            exp = ref5[i];
            if (!(exp.unwrap() instanceof Comment)) {
              break;
            }
            results.push(exp);
          }
          return results;
        }).call(this);
        rest = this.expressions.slice(preludeExps.length);
        this.expressions = preludeExps;
        if (preludeExps.length) {
          prelude = this.compileNode(merge(o, {
            indent: ''
          }));
          prelude.push(this.makeCode("\n"));
        }
        this.expressions = rest;
      }
      fragments = this.compileWithDeclarations(o);
      if (o.bare) {
        return fragments;
      }
      return [].concat(prelude, this.makeCode("(function() {\n"), fragments, this.makeCode("\n}).call(this);\n"));
    };

    Block.prototype.compileWithDeclarations = function(o) {
      var assigns, declars, exp, fragments, i, j, len1, post, ref3, ref4, ref5, rest, scope, spaced;
      fragments = [];
      post = [];
      ref3 = this.expressions;
      for (i = j = 0, len1 = ref3.length; j < len1; i = ++j) {
        exp = ref3[i];
        exp = exp.unwrap();
        if (!(exp instanceof Comment || exp instanceof Literal)) {
          break;
        }
      }
      o = merge(o, {
        level: LEVEL_TOP
      });
      if (i) {
        rest = this.expressions.splice(i, 9e9);
        ref4 = [this.spaced, false], spaced = ref4[0], this.spaced = ref4[1];
        ref5 = [this.compileNode(o), spaced], fragments = ref5[0], this.spaced = ref5[1];
        this.expressions = rest;
      }
      post = this.compileNode(o);
      scope = o.scope;
      if (scope.expressions === this) {
        declars = o.scope.hasDeclarations();
        assigns = scope.hasAssignments;
        if (declars || assigns) {
          if (i) {
            fragments.push(this.makeCode('\n'));
          }
          fragments.push(this.makeCode(this.tab + "var "));
          if (declars) {
            fragments.push(this.makeCode(scope.declaredVariables().join(', ')));
          }
          if (assigns) {
            if (declars) {
              fragments.push(this.makeCode(",\n" + (this.tab + TAB)));
            }
            fragments.push(this.makeCode(scope.assignedVariables().join(",\n" + (this.tab + TAB))));
          }
          fragments.push(this.makeCode(";\n" + (this.spaced ? '\n' : '')));
        } else if (fragments.length && post.length) {
          fragments.push(this.makeCode("\n"));
        }
      }
      return fragments.concat(post);
    };

    Block.wrap = function(nodes) {
      if (nodes.length === 1 && nodes[0] instanceof Block) {
        return nodes[0];
      }
      return new Block(nodes);
    };

    return Block;

  })(Base);

  exports.Literal = Literal = (function(superClass1) {
    extend1(Literal, superClass1);

    function Literal(value1) {
      this.value = value1;
    }

    Literal.prototype.isComplex = NO;

    Literal.prototype.assigns = function(name) {
      return name === this.value;
    };

    Literal.prototype.compileNode = function(o) {
      return [this.makeCode(this.value)];
    };

    Literal.prototype.toString = function() {
      return " " + (this.isStatement() ? Literal.__super__.toString.apply(this, arguments) : this.constructor.name) + ": " + this.value;
    };

    return Literal;

  })(Base);

  exports.NumberLiteral = NumberLiteral = (function(superClass1) {
    extend1(NumberLiteral, superClass1);

    function NumberLiteral() {
      return NumberLiteral.__super__.constructor.apply(this, arguments);
    }

    return NumberLiteral;

  })(Literal);

  exports.InfinityLiteral = InfinityLiteral = (function(superClass1) {
    extend1(InfinityLiteral, superClass1);

    function InfinityLiteral() {
      return InfinityLiteral.__super__.constructor.apply(this, arguments);
    }

    InfinityLiteral.prototype.compileNode = function() {
      return [this.makeCode('2e308')];
    };

    return InfinityLiteral;

  })(NumberLiteral);

  exports.NaNLiteral = NaNLiteral = (function(superClass1) {
    extend1(NaNLiteral, superClass1);

    function NaNLiteral() {
      NaNLiteral.__super__.constructor.call(this, 'NaN');
    }

    NaNLiteral.prototype.compileNode = function(o) {
      var code;
      code = [this.makeCode('0/0')];
      if (o.level >= LEVEL_OP) {
        return this.wrapInBraces(code);
      } else {
        return code;
      }
    };

    return NaNLiteral;

  })(NumberLiteral);

  exports.StringLiteral = StringLiteral = (function(superClass1) {
    extend1(StringLiteral, superClass1);

    function StringLiteral() {
      return StringLiteral.__super__.constructor.apply(this, arguments);
    }

    return StringLiteral;

  })(Literal);

  exports.RegexLiteral = RegexLiteral = (function(superClass1) {
    extend1(RegexLiteral, superClass1);

    function RegexLiteral() {
      return RegexLiteral.__super__.constructor.apply(this, arguments);
    }

    return RegexLiteral;

  })(Literal);

  exports.PassthroughLiteral = PassthroughLiteral = (function(superClass1) {
    extend1(PassthroughLiteral, superClass1);

    function PassthroughLiteral() {
      return PassthroughLiteral.__super__.constructor.apply(this, arguments);
    }

    return PassthroughLiteral;

  })(Literal);

  exports.IdentifierLiteral = IdentifierLiteral = (function(superClass1) {
    extend1(IdentifierLiteral, superClass1);

    function IdentifierLiteral() {
      return IdentifierLiteral.__super__.constructor.apply(this, arguments);
    }

    IdentifierLiteral.prototype.isAssignable = YES;

    return IdentifierLiteral;

  })(Literal);

  exports.PropertyName = PropertyName = (function(superClass1) {
    extend1(PropertyName, superClass1);

    function PropertyName() {
      return PropertyName.__super__.constructor.apply(this, arguments);
    }

    PropertyName.prototype.isAssignable = YES;

    return PropertyName;

  })(Literal);

  exports.StatementLiteral = StatementLiteral = (function(superClass1) {
    extend1(StatementLiteral, superClass1);

    function StatementLiteral() {
      return StatementLiteral.__super__.constructor.apply(this, arguments);
    }

    StatementLiteral.prototype.isStatement = YES;

    StatementLiteral.prototype.makeReturn = THIS;

    StatementLiteral.prototype.jumps = function(o) {
      if (this.value === 'break' && !((o != null ? o.loop : void 0) || (o != null ? o.block : void 0))) {
        return this;
      }
      if (this.value === 'continue' && !(o != null ? o.loop : void 0)) {
        return this;
      }
    };

    StatementLiteral.prototype.compileNode = function(o) {
      return [this.makeCode("" + this.tab + this.value + ";")];
    };

    return StatementLiteral;

  })(Literal);

  exports.ThisLiteral = ThisLiteral = (function(superClass1) {
    extend1(ThisLiteral, superClass1);

    function ThisLiteral() {
      ThisLiteral.__super__.constructor.call(this, 'this');
    }

    ThisLiteral.prototype.compileNode = function(o) {
      var code, ref3;
      code = ((ref3 = o.scope.method) != null ? ref3.bound : void 0) ? o.scope.method.context : this.value;
      return [this.makeCode(code)];
    };

    return ThisLiteral;

  })(Literal);

  exports.UndefinedLiteral = UndefinedLiteral = (function(superClass1) {
    extend1(UndefinedLiteral, superClass1);

    function UndefinedLiteral() {
      UndefinedLiteral.__super__.constructor.call(this, 'undefined');
    }

    UndefinedLiteral.prototype.compileNode = function(o) {
      return [this.makeCode(o.level >= LEVEL_ACCESS ? '(void 0)' : 'void 0')];
    };

    return UndefinedLiteral;

  })(Literal);

  exports.NullLiteral = NullLiteral = (function(superClass1) {
    extend1(NullLiteral, superClass1);

    function NullLiteral() {
      NullLiteral.__super__.constructor.call(this, 'null');
    }

    return NullLiteral;

  })(Literal);

  exports.BooleanLiteral = BooleanLiteral = (function(superClass1) {
    extend1(BooleanLiteral, superClass1);

    function BooleanLiteral() {
      return BooleanLiteral.__super__.constructor.apply(this, arguments);
    }

    return BooleanLiteral;

  })(Literal);

  exports.Return = Return = (function(superClass1) {
    extend1(Return, superClass1);

    function Return(expression) {
      this.expression = expression;
    }

    Return.prototype.children = ['expression'];

    Return.prototype.isStatement = YES;

    Return.prototype.makeReturn = THIS;

    Return.prototype.jumps = THIS;

    Return.prototype.compileToFragments = function(o, level) {
      var expr, ref3;
      expr = (ref3 = this.expression) != null ? ref3.makeReturn() : void 0;
      if (expr && !(expr instanceof Return)) {
        return expr.compileToFragments(o, level);
      } else {
        return Return.__super__.compileToFragments.call(this, o, level);
      }
    };

    Return.prototype.compileNode = function(o) {
      var answer;
      answer = [];
      answer.push(this.makeCode(this.tab + ("return" + (this.expression ? " " : ""))));
      if (this.expression) {
        answer = answer.concat(this.expression.compileToFragments(o, LEVEL_PAREN));
      }
      answer.push(this.makeCode(";"));
      return answer;
    };

    return Return;

  })(Base);

  exports.YieldReturn = YieldReturn = (function(superClass1) {
    extend1(YieldReturn, superClass1);

    function YieldReturn() {
      return YieldReturn.__super__.constructor.apply(this, arguments);
    }

    YieldReturn.prototype.compileNode = function(o) {
      if (o.scope.parent == null) {
        this.error('yield can only occur inside functions');
      }
      return YieldReturn.__super__.compileNode.apply(this, arguments);
    };

    return YieldReturn;

  })(Return);

  exports.Value = Value = (function(superClass1) {
    extend1(Value, superClass1);

    function Value(base, props, tag) {
      if (!props && base instanceof Value) {
        return base;
      }
      this.base = base;
      this.properties = props || [];
      if (tag) {
        this[tag] = true;
      }
      return this;
    }

    Value.prototype.children = ['base', 'properties'];

    Value.prototype.add = function(props) {
      this.properties = this.properties.concat(props);
      return this;
    };

    Value.prototype.hasProperties = function() {
      return !!this.properties.length;
    };

    Value.prototype.bareLiteral = function(type) {
      return !this.properties.length && this.base instanceof type;
    };

    Value.prototype.isArray = function() {
      return this.bareLiteral(Arr);
    };

    Value.prototype.isRange = function() {
      return this.bareLiteral(Range);
    };

    Value.prototype.isComplex = function() {
      return this.hasProperties() || this.base.isComplex();
    };

    Value.prototype.isAssignable = function() {
      return this.hasProperties() || this.base.isAssignable();
    };

    Value.prototype.isNumber = function() {
      return this.bareLiteral(NumberLiteral);
    };

    Value.prototype.isString = function() {
      return this.bareLiteral(StringLiteral);
    };

    Value.prototype.isRegex = function() {
      return this.bareLiteral(RegexLiteral);
    };

    Value.prototype.isUndefined = function() {
      return this.bareLiteral(UndefinedLiteral);
    };

    Value.prototype.isNull = function() {
      return this.bareLiteral(NullLiteral);
    };

    Value.prototype.isBoolean = function() {
      return this.bareLiteral(BooleanLiteral);
    };

    Value.prototype.isAtomic = function() {
      var j, len1, node, ref3;
      ref3 = this.properties.concat(this.base);
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        node = ref3[j];
        if (node.soak || node instanceof Call) {
          return false;
        }
      }
      return true;
    };

    Value.prototype.isNotCallable = function() {
      return this.isNumber() || this.isString() || this.isRegex() || this.isArray() || this.isRange() || this.isSplice() || this.isObject() || this.isUndefined() || this.isNull() || this.isBoolean();
    };

    Value.prototype.isStatement = function(o) {
      return !this.properties.length && this.base.isStatement(o);
    };

    Value.prototype.assigns = function(name) {
      return !this.properties.length && this.base.assigns(name);
    };

    Value.prototype.jumps = function(o) {
      return !this.properties.length && this.base.jumps(o);
    };

    Value.prototype.isObject = function(onlyGenerated) {
      if (this.properties.length) {
        return false;
      }
      return (this.base instanceof Obj) && (!onlyGenerated || this.base.generated);
    };

    Value.prototype.isSplice = function() {
      var lastProp, ref3;
      ref3 = this.properties, lastProp = ref3[ref3.length - 1];
      return lastProp instanceof Slice;
    };

    Value.prototype.looksStatic = function(className) {
      var ref3;
      return this.base.value === className && this.properties.length === 1 && ((ref3 = this.properties[0].name) != null ? ref3.value : void 0) !== 'prototype';
    };

    Value.prototype.unwrap = function() {
      if (this.properties.length) {
        return this;
      } else {
        return this.base;
      }
    };

    Value.prototype.cacheReference = function(o) {
      var base, bref, name, nref, ref3;
      ref3 = this.properties, name = ref3[ref3.length - 1];
      if (this.properties.length < 2 && !this.base.isComplex() && !(name != null ? name.isComplex() : void 0)) {
        return [this, this];
      }
      base = new Value(this.base, this.properties.slice(0, -1));
      if (base.isComplex()) {
        bref = new IdentifierLiteral(o.scope.freeVariable('base'));
        base = new Value(new Parens(new Assign(bref, base)));
      }
      if (!name) {
        return [base, bref];
      }
      if (name.isComplex()) {
        nref = new IdentifierLiteral(o.scope.freeVariable('name'));
        name = new Index(new Assign(nref, name.index));
        nref = new Index(nref);
      }
      return [base.add(name), new Value(bref || base.base, [nref || name])];
    };

    Value.prototype.compileNode = function(o) {
      var fragments, j, len1, prop, props;
      this.base.front = this.front;
      props = this.properties;
      fragments = this.base.compileToFragments(o, (props.length ? LEVEL_ACCESS : null));
      if (props.length && SIMPLENUM.test(fragmentsToText(fragments))) {
        fragments.push(this.makeCode('.'));
      }
      for (j = 0, len1 = props.length; j < len1; j++) {
        prop = props[j];
        fragments.push.apply(fragments, prop.compileToFragments(o));
      }
      return fragments;
    };

    Value.prototype.unfoldSoak = function(o) {
      return this.unfoldedSoak != null ? this.unfoldedSoak : this.unfoldedSoak = (function(_this) {
        return function() {
          var fst, i, ifn, j, len1, prop, ref, ref3, ref4, snd;
          if (ifn = _this.base.unfoldSoak(o)) {
            (ref3 = ifn.body.properties).push.apply(ref3, _this.properties);
            return ifn;
          }
          ref4 = _this.properties;
          for (i = j = 0, len1 = ref4.length; j < len1; i = ++j) {
            prop = ref4[i];
            if (!prop.soak) {
              continue;
            }
            prop.soak = false;
            fst = new Value(_this.base, _this.properties.slice(0, i));
            snd = new Value(_this.base, _this.properties.slice(i));
            if (fst.isComplex()) {
              ref = new IdentifierLiteral(o.scope.freeVariable('ref'));
              fst = new Parens(new Assign(ref, fst));
              snd.base = ref;
            }
            return new If(new Existence(fst), snd, {
              soak: true
            });
          }
          return false;
        };
      })(this)();
    };

    return Value;

  })(Base);

  exports.Comment = Comment = (function(superClass1) {
    extend1(Comment, superClass1);

    function Comment(comment1) {
      this.comment = comment1;
    }

    Comment.prototype.isStatement = YES;

    Comment.prototype.makeReturn = THIS;

    Comment.prototype.compileNode = function(o, level) {
      var code, comment;
      comment = this.comment.replace(/^(\s*)#(?=\s)/gm, "$1 *");
      code = "/*" + (multident(comment, this.tab)) + (indexOf.call(comment, '\n') >= 0 ? "\n" + this.tab : '') + " */";
      if ((level || o.level) === LEVEL_TOP) {
        code = o.indent + code;
      }
      return [this.makeCode("\n"), this.makeCode(code)];
    };

    return Comment;

  })(Base);

  exports.Call = Call = (function(superClass1) {
    extend1(Call, superClass1);

    function Call(variable1, args1, soak1) {
      this.variable = variable1;
      this.args = args1 != null ? args1 : [];
      this.soak = soak1;
      this.isNew = false;
      if (this.variable instanceof Value && this.variable.isNotCallable()) {
        this.variable.error("literal is not a function");
      }
    }

    Call.prototype.children = ['variable', 'args'];

    Call.prototype.newInstance = function() {
      var base, ref3;
      base = ((ref3 = this.variable) != null ? ref3.base : void 0) || this.variable;
      if (base instanceof Call && !base.isNew) {
        base.newInstance();
      } else {
        this.isNew = true;
      }
      return this;
    };

    Call.prototype.unfoldSoak = function(o) {
      var call, ifn, j, left, len1, list, ref3, ref4, rite;
      if (this.soak) {
        if (this instanceof SuperCall) {
          left = new Literal(this.superReference(o));
          rite = new Value(left);
        } else {
          if (ifn = unfoldSoak(o, this, 'variable')) {
            return ifn;
          }
          ref3 = new Value(this.variable).cacheReference(o), left = ref3[0], rite = ref3[1];
        }
        rite = new Call(rite, this.args);
        rite.isNew = this.isNew;
        left = new Literal("typeof " + (left.compile(o)) + " === \"function\"");
        return new If(left, new Value(rite), {
          soak: true
        });
      }
      call = this;
      list = [];
      while (true) {
        if (call.variable instanceof Call) {
          list.push(call);
          call = call.variable;
          continue;
        }
        if (!(call.variable instanceof Value)) {
          break;
        }
        list.push(call);
        if (!((call = call.variable.base) instanceof Call)) {
          break;
        }
      }
      ref4 = list.reverse();
      for (j = 0, len1 = ref4.length; j < len1; j++) {
        call = ref4[j];
        if (ifn) {
          if (call.variable instanceof Call) {
            call.variable = ifn;
          } else {
            call.variable.base = ifn;
          }
        }
        ifn = unfoldSoak(o, call, 'variable');
      }
      return ifn;
    };

    Call.prototype.compileNode = function(o) {
      var arg, argIndex, compiledArgs, compiledArray, fragments, j, len1, preface, ref3, ref4;
      if ((ref3 = this.variable) != null) {
        ref3.front = this.front;
      }
      compiledArray = Splat.compileSplattedArray(o, this.args, true);
      if (compiledArray.length) {
        return this.compileSplat(o, compiledArray);
      }
      compiledArgs = [];
      ref4 = this.args;
      for (argIndex = j = 0, len1 = ref4.length; j < len1; argIndex = ++j) {
        arg = ref4[argIndex];
        if (argIndex) {
          compiledArgs.push(this.makeCode(", "));
        }
        compiledArgs.push.apply(compiledArgs, arg.compileToFragments(o, LEVEL_LIST));
      }
      fragments = [];
      if (this instanceof SuperCall) {
        preface = this.superReference(o) + (".call(" + (this.superThis(o)));
        if (compiledArgs.length) {
          preface += ", ";
        }
        fragments.push(this.makeCode(preface));
      } else {
        if (this.isNew) {
          fragments.push(this.makeCode('new '));
        }
        fragments.push.apply(fragments, this.variable.compileToFragments(o, LEVEL_ACCESS));
        fragments.push(this.makeCode("("));
      }
      fragments.push.apply(fragments, compiledArgs);
      fragments.push(this.makeCode(")"));
      return fragments;
    };

    Call.prototype.compileSplat = function(o, splatArgs) {
      var answer, base, fun, idt, name, ref;
      if (this instanceof SuperCall) {
        return [].concat(this.makeCode((this.superReference(o)) + ".apply(" + (this.superThis(o)) + ", "), splatArgs, this.makeCode(")"));
      }
      if (this.isNew) {
        idt = this.tab + TAB;
        return [].concat(this.makeCode("(function(func, args, ctor) {\n" + idt + "ctor.prototype = func.prototype;\n" + idt + "var child = new ctor, result = func.apply(child, args);\n" + idt + "return Object(result) === result ? result : child;\n" + this.tab + "})("), this.variable.compileToFragments(o, LEVEL_LIST), this.makeCode(", "), splatArgs, this.makeCode(", function(){})"));
      }
      answer = [];
      base = new Value(this.variable);
      if ((name = base.properties.pop()) && base.isComplex()) {
        ref = o.scope.freeVariable('ref');
        answer = answer.concat(this.makeCode("(" + ref + " = "), base.compileToFragments(o, LEVEL_LIST), this.makeCode(")"), name.compileToFragments(o));
      } else {
        fun = base.compileToFragments(o, LEVEL_ACCESS);
        if (SIMPLENUM.test(fragmentsToText(fun))) {
          fun = this.wrapInBraces(fun);
        }
        if (name) {
          ref = fragmentsToText(fun);
          fun.push.apply(fun, name.compileToFragments(o));
        } else {
          ref = 'null';
        }
        answer = answer.concat(fun);
      }
      return answer = answer.concat(this.makeCode(".apply(" + ref + ", "), splatArgs, this.makeCode(")"));
    };

    return Call;

  })(Base);

  exports.SuperCall = SuperCall = (function(superClass1) {
    extend1(SuperCall, superClass1);

    function SuperCall(args) {
      SuperCall.__super__.constructor.call(this, null, args != null ? args : [new Splat(new IdentifierLiteral('arguments'))]);
      this.isBare = args != null;
    }

    SuperCall.prototype.superReference = function(o) {
      var accesses, base, bref, klass, method, name, nref, variable;
      method = o.scope.namedMethod();
      if (method != null ? method.klass : void 0) {
        klass = method.klass, name = method.name, variable = method.variable;
        if (klass.isComplex()) {
          bref = new IdentifierLiteral(o.scope.parent.freeVariable('base'));
          base = new Value(new Parens(new Assign(bref, klass)));
          variable.base = base;
          variable.properties.splice(0, klass.properties.length);
        }
        if (name.isComplex() || (name instanceof Index && name.index.isAssignable())) {
          nref = new IdentifierLiteral(o.scope.parent.freeVariable('name'));
          name = new Index(new Assign(nref, name.index));
          variable.properties.pop();
          variable.properties.push(name);
        }
        accesses = [new Access(new PropertyName('__super__'))];
        if (method["static"]) {
          accesses.push(new Access(new PropertyName('constructor')));
        }
        accesses.push(nref != null ? new Index(nref) : name);
        return (new Value(bref != null ? bref : klass, accesses)).compile(o);
      } else if (method != null ? method.ctor : void 0) {
        return method.name + ".__super__.constructor";
      } else {
        return this.error('cannot call super outside of an instance method.');
      }
    };

    SuperCall.prototype.superThis = function(o) {
      var method;
      method = o.scope.method;
      return (method && !method.klass && method.context) || "this";
    };

    return SuperCall;

  })(Call);

  exports.RegexWithInterpolations = RegexWithInterpolations = (function(superClass1) {
    extend1(RegexWithInterpolations, superClass1);

    function RegexWithInterpolations(args) {
      if (args == null) {
        args = [];
      }
      RegexWithInterpolations.__super__.constructor.call(this, new Value(new IdentifierLiteral('RegExp')), args, false);
    }

    return RegexWithInterpolations;

  })(Call);

  exports.TaggedTemplateCall = TaggedTemplateCall = (function(superClass1) {
    extend1(TaggedTemplateCall, superClass1);

    function TaggedTemplateCall(variable, arg, soak) {
      if (arg instanceof StringLiteral) {
        arg = new StringWithInterpolations(Block.wrap([new Value(arg)]));
      }
      TaggedTemplateCall.__super__.constructor.call(this, variable, [arg], soak);
    }

    TaggedTemplateCall.prototype.compileNode = function(o) {
      o.inTaggedTemplateCall = true;
      return this.variable.compileToFragments(o, LEVEL_ACCESS).concat(this.args[0].compileToFragments(o, LEVEL_LIST));
    };

    return TaggedTemplateCall;

  })(Call);

  exports.Extends = Extends = (function(superClass1) {
    extend1(Extends, superClass1);

    function Extends(child1, parent1) {
      this.child = child1;
      this.parent = parent1;
    }

    Extends.prototype.children = ['child', 'parent'];

    Extends.prototype.compileToFragments = function(o) {
      return new Call(new Value(new Literal(utility('extend', o))), [this.child, this.parent]).compileToFragments(o);
    };

    return Extends;

  })(Base);

  exports.Access = Access = (function(superClass1) {
    extend1(Access, superClass1);

    function Access(name1, tag) {
      this.name = name1;
      this.soak = tag === 'soak';
    }

    Access.prototype.children = ['name'];

    Access.prototype.compileToFragments = function(o) {
      var name, node, ref3;
      name = this.name.compileToFragments(o);
      node = this.name.unwrap();
      if (node instanceof PropertyName) {
        if (ref3 = node.value, indexOf.call(JS_FORBIDDEN, ref3) >= 0) {
          return [this.makeCode('["')].concat(slice.call(name), [this.makeCode('"]')]);
        } else {
          return [this.makeCode('.')].concat(slice.call(name));
        }
      } else {
        return [this.makeCode('[')].concat(slice.call(name), [this.makeCode(']')]);
      }
    };

    Access.prototype.isComplex = NO;

    return Access;

  })(Base);

  exports.Index = Index = (function(superClass1) {
    extend1(Index, superClass1);

    function Index(index1) {
      this.index = index1;
    }

    Index.prototype.children = ['index'];

    Index.prototype.compileToFragments = function(o) {
      return [].concat(this.makeCode("["), this.index.compileToFragments(o, LEVEL_PAREN), this.makeCode("]"));
    };

    Index.prototype.isComplex = function() {
      return this.index.isComplex();
    };

    return Index;

  })(Base);

  exports.Range = Range = (function(superClass1) {
    extend1(Range, superClass1);

    Range.prototype.children = ['from', 'to'];

    function Range(from1, to1, tag) {
      this.from = from1;
      this.to = to1;
      this.exclusive = tag === 'exclusive';
      this.equals = this.exclusive ? '' : '=';
    }

    Range.prototype.compileVariables = function(o) {
      var isComplex, ref3, ref4, ref5, step;
      o = merge(o, {
        top: true
      });
      isComplex = del(o, 'isComplex');
      ref3 = this.cacheToCodeFragments(this.from.cache(o, LEVEL_LIST, isComplex)), this.fromC = ref3[0], this.fromVar = ref3[1];
      ref4 = this.cacheToCodeFragments(this.to.cache(o, LEVEL_LIST, isComplex)), this.toC = ref4[0], this.toVar = ref4[1];
      if (step = del(o, 'step')) {
        ref5 = this.cacheToCodeFragments(step.cache(o, LEVEL_LIST, isComplex)), this.step = ref5[0], this.stepVar = ref5[1];
      }
      this.fromNum = this.from.isNumber() ? Number(this.fromVar) : null;
      this.toNum = this.to.isNumber() ? Number(this.toVar) : null;
      return this.stepNum = (step != null ? step.isNumber() : void 0) ? Number(this.stepVar) : null;
    };

    Range.prototype.compileNode = function(o) {
      var cond, condPart, from, gt, idx, idxName, known, lt, namedIndex, ref3, ref4, stepPart, to, varPart;
      if (!this.fromVar) {
        this.compileVariables(o);
      }
      if (!o.index) {
        return this.compileArray(o);
      }
      known = (this.fromNum != null) && (this.toNum != null);
      idx = del(o, 'index');
      idxName = del(o, 'name');
      namedIndex = idxName && idxName !== idx;
      varPart = idx + " = " + this.fromC;
      if (this.toC !== this.toVar) {
        varPart += ", " + this.toC;
      }
      if (this.step !== this.stepVar) {
        varPart += ", " + this.step;
      }
      ref3 = [idx + " <" + this.equals, idx + " >" + this.equals], lt = ref3[0], gt = ref3[1];
      condPart = this.stepNum != null ? this.stepNum > 0 ? lt + " " + this.toVar : gt + " " + this.toVar : known ? ((ref4 = [this.fromNum, this.toNum], from = ref4[0], to = ref4[1], ref4), from <= to ? lt + " " + to : gt + " " + to) : (cond = this.stepVar ? this.stepVar + " > 0" : this.fromVar + " <= " + this.toVar, cond + " ? " + lt + " " + this.toVar + " : " + gt + " " + this.toVar);
      stepPart = this.stepVar ? idx + " += " + this.stepVar : known ? namedIndex ? from <= to ? "++" + idx : "--" + idx : from <= to ? idx + "++" : idx + "--" : namedIndex ? cond + " ? ++" + idx + " : --" + idx : cond + " ? " + idx + "++ : " + idx + "--";
      if (namedIndex) {
        varPart = idxName + " = " + varPart;
      }
      if (namedIndex) {
        stepPart = idxName + " = " + stepPart;
      }
      return [this.makeCode(varPart + "; " + condPart + "; " + stepPart)];
    };

    Range.prototype.compileArray = function(o) {
      var args, body, cond, hasArgs, i, idt, j, known, post, pre, range, ref3, ref4, result, results, vars;
      known = (this.fromNum != null) && (this.toNum != null);
      if (known && Math.abs(this.fromNum - this.toNum) <= 20) {
        range = (function() {
          results = [];
          for (var j = ref3 = this.fromNum, ref4 = this.toNum; ref3 <= ref4 ? j <= ref4 : j >= ref4; ref3 <= ref4 ? j++ : j--){ results.push(j); }
          return results;
        }).apply(this);
        if (this.exclusive) {
          range.pop();
        }
        return [this.makeCode("[" + (range.join(', ')) + "]")];
      }
      idt = this.tab + TAB;
      i = o.scope.freeVariable('i', {
        single: true
      });
      result = o.scope.freeVariable('results');
      pre = "\n" + idt + result + " = [];";
      if (known) {
        o.index = i;
        body = fragmentsToText(this.compileNode(o));
      } else {
        vars = (i + " = " + this.fromC) + (this.toC !== this.toVar ? ", " + this.toC : '');
        cond = this.fromVar + " <= " + this.toVar;
        body = "var " + vars + "; " + cond + " ? " + i + " <" + this.equals + " " + this.toVar + " : " + i + " >" + this.equals + " " + this.toVar + "; " + cond + " ? " + i + "++ : " + i + "--";
      }
      post = "{ " + result + ".push(" + i + "); }\n" + idt + "return " + result + ";\n" + o.indent;
      hasArgs = function(node) {
        return node != null ? node.contains(isLiteralArguments) : void 0;
      };
      if (hasArgs(this.from) || hasArgs(this.to)) {
        args = ', arguments';
      }
      return [this.makeCode("(function() {" + pre + "\n" + idt + "for (" + body + ")" + post + "}).apply(this" + (args != null ? args : '') + ")")];
    };

    return Range;

  })(Base);

  exports.Slice = Slice = (function(superClass1) {
    extend1(Slice, superClass1);

    Slice.prototype.children = ['range'];

    function Slice(range1) {
      this.range = range1;
      Slice.__super__.constructor.call(this);
    }

    Slice.prototype.compileNode = function(o) {
      var compiled, compiledText, from, fromCompiled, ref3, to, toStr;
      ref3 = this.range, to = ref3.to, from = ref3.from;
      fromCompiled = from && from.compileToFragments(o, LEVEL_PAREN) || [this.makeCode('0')];
      if (to) {
        compiled = to.compileToFragments(o, LEVEL_PAREN);
        compiledText = fragmentsToText(compiled);
        if (!(!this.range.exclusive && +compiledText === -1)) {
          toStr = ', ' + (this.range.exclusive ? compiledText : to.isNumber() ? "" + (+compiledText + 1) : (compiled = to.compileToFragments(o, LEVEL_ACCESS), "+" + (fragmentsToText(compiled)) + " + 1 || 9e9"));
        }
      }
      return [this.makeCode(".slice(" + (fragmentsToText(fromCompiled)) + (toStr || '') + ")")];
    };

    return Slice;

  })(Base);

  exports.Obj = Obj = (function(superClass1) {
    extend1(Obj, superClass1);

    function Obj(props, generated) {
      this.generated = generated != null ? generated : false;
      this.objects = this.properties = props || [];
    }

    Obj.prototype.children = ['properties'];

    Obj.prototype.compileNode = function(o) {
      var answer, dynamicIndex, hasDynamic, i, idt, indent, j, join, k, key, l, lastNoncom, len1, len2, len3, node, oref, prop, props, ref3, value;
      props = this.properties;
      if (this.generated) {
        for (j = 0, len1 = props.length; j < len1; j++) {
          node = props[j];
          if (node instanceof Value) {
            node.error('cannot have an implicit value in an implicit object');
          }
        }
      }
      for (dynamicIndex = k = 0, len2 = props.length; k < len2; dynamicIndex = ++k) {
        prop = props[dynamicIndex];
        if ((prop.variable || prop).base instanceof Parens) {
          break;
        }
      }
      hasDynamic = dynamicIndex < props.length;
      idt = o.indent += TAB;
      lastNoncom = this.lastNonComment(this.properties);
      answer = [];
      if (hasDynamic) {
        oref = o.scope.freeVariable('obj');
        answer.push(this.makeCode("(\n" + idt + oref + " = "));
      }
      answer.push(this.makeCode("{" + (props.length === 0 || dynamicIndex === 0 ? '}' : '\n')));
      for (i = l = 0, len3 = props.length; l < len3; i = ++l) {
        prop = props[i];
        if (i === dynamicIndex) {
          if (i !== 0) {
            answer.push(this.makeCode("\n" + idt + "}"));
          }
          answer.push(this.makeCode(',\n'));
        }
        join = i === props.length - 1 || i === dynamicIndex - 1 ? '' : prop === lastNoncom || prop instanceof Comment ? '\n' : ',\n';
        indent = prop instanceof Comment ? '' : idt;
        if (hasDynamic && i < dynamicIndex) {
          indent += TAB;
        }
        if (prop instanceof Assign) {
          if (prop.context !== 'object') {
            prop.operatorToken.error("unexpected " + prop.operatorToken.value);
          }
          if (prop.variable instanceof Value && prop.variable.hasProperties()) {
            prop.variable.error('invalid object key');
          }
        }
        if (prop instanceof Value && prop["this"]) {
          prop = new Assign(prop.properties[0].name, prop, 'object');
        }
        if (!(prop instanceof Comment)) {
          if (i < dynamicIndex) {
            if (!(prop instanceof Assign)) {
              prop = new Assign(prop, prop, 'object');
            }
          } else {
            if (prop instanceof Assign) {
              key = prop.variable;
              value = prop.value;
            } else {
              ref3 = prop.base.cache(o), key = ref3[0], value = ref3[1];
              if (key instanceof IdentifierLiteral) {
                key = new PropertyName(key.value);
              }
            }
            prop = new Assign(new Value(new IdentifierLiteral(oref), [new Access(key)]), value);
          }
        }
        if (indent) {
          answer.push(this.makeCode(indent));
        }
        answer.push.apply(answer, prop.compileToFragments(o, LEVEL_TOP));
        if (join) {
          answer.push(this.makeCode(join));
        }
      }
      if (hasDynamic) {
        answer.push(this.makeCode(",\n" + idt + oref + "\n" + this.tab + ")"));
      } else {
        if (props.length !== 0) {
          answer.push(this.makeCode("\n" + this.tab + "}"));
        }
      }
      if (this.front && !hasDynamic) {
        return this.wrapInBraces(answer);
      } else {
        return answer;
      }
    };

    Obj.prototype.assigns = function(name) {
      var j, len1, prop, ref3;
      ref3 = this.properties;
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        prop = ref3[j];
        if (prop.assigns(name)) {
          return true;
        }
      }
      return false;
    };

    return Obj;

  })(Base);

  exports.Arr = Arr = (function(superClass1) {
    extend1(Arr, superClass1);

    function Arr(objs) {
      this.objects = objs || [];
    }

    Arr.prototype.children = ['objects'];

    Arr.prototype.compileNode = function(o) {
      var answer, compiledObjs, fragments, index, j, len1, obj;
      if (!this.objects.length) {
        return [this.makeCode('[]')];
      }
      o.indent += TAB;
      answer = Splat.compileSplattedArray(o, this.objects);
      if (answer.length) {
        return answer;
      }
      answer = [];
      compiledObjs = (function() {
        var j, len1, ref3, results;
        ref3 = this.objects;
        results = [];
        for (j = 0, len1 = ref3.length; j < len1; j++) {
          obj = ref3[j];
          results.push(obj.compileToFragments(o, LEVEL_LIST));
        }
        return results;
      }).call(this);
      for (index = j = 0, len1 = compiledObjs.length; j < len1; index = ++j) {
        fragments = compiledObjs[index];
        if (index) {
          answer.push(this.makeCode(", "));
        }
        answer.push.apply(answer, fragments);
      }
      if (fragmentsToText(answer).indexOf('\n') >= 0) {
        answer.unshift(this.makeCode("[\n" + o.indent));
        answer.push(this.makeCode("\n" + this.tab + "]"));
      } else {
        answer.unshift(this.makeCode("["));
        answer.push(this.makeCode("]"));
      }
      return answer;
    };

    Arr.prototype.assigns = function(name) {
      var j, len1, obj, ref3;
      ref3 = this.objects;
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        obj = ref3[j];
        if (obj.assigns(name)) {
          return true;
        }
      }
      return false;
    };

    return Arr;

  })(Base);

  exports.Class = Class = (function(superClass1) {
    extend1(Class, superClass1);

    function Class(variable1, parent1, body1) {
      this.variable = variable1;
      this.parent = parent1;
      this.body = body1 != null ? body1 : new Block;
      this.boundFuncs = [];
      this.body.classBody = true;
    }

    Class.prototype.children = ['variable', 'parent', 'body'];

    Class.prototype.defaultClassVariableName = '_Class';

    Class.prototype.determineName = function() {
      var message, name, node, ref3, tail;
      if (!this.variable) {
        return this.defaultClassVariableName;
      }
      ref3 = this.variable.properties, tail = ref3[ref3.length - 1];
      node = tail ? tail instanceof Access && tail.name : this.variable.base;
      if (!(node instanceof IdentifierLiteral || node instanceof PropertyName)) {
        return this.defaultClassVariableName;
      }
      name = node.value;
      if (!tail) {
        message = isUnassignable(name);
        if (message) {
          this.variable.error(message);
        }
      }
      if (indexOf.call(JS_FORBIDDEN, name) >= 0) {
        return "_" + name;
      } else {
        return name;
      }
    };

    Class.prototype.setContext = function(name) {
      return this.body.traverseChildren(false, function(node) {
        if (node.classBody) {
          return false;
        }
        if (node instanceof ThisLiteral) {
          return node.value = name;
        } else if (node instanceof Code) {
          if (node.bound) {
            return node.context = name;
          }
        }
      });
    };

    Class.prototype.addBoundFunctions = function(o) {
      var bvar, j, len1, lhs, ref3;
      ref3 = this.boundFuncs;
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        bvar = ref3[j];
        lhs = (new Value(new ThisLiteral, [new Access(bvar)])).compile(o);
        this.ctor.body.unshift(new Literal(lhs + " = " + (utility('bind', o)) + "(" + lhs + ", this)"));
      }
    };

    Class.prototype.addProperties = function(node, name, o) {
      var acc, assign, base, exprs, func, props;
      props = node.base.properties.slice(0);
      exprs = (function() {
        var results;
        results = [];
        while (assign = props.shift()) {
          if (assign instanceof Assign) {
            base = assign.variable.base;
            delete assign.context;
            func = assign.value;
            if (base.value === 'constructor') {
              if (this.ctor) {
                assign.error('cannot define more than one constructor in a class');
              }
              if (func.bound) {
                assign.error('cannot define a constructor as a bound function');
              }
              if (func instanceof Code) {
                assign = this.ctor = func;
              } else {
                this.externalCtor = o.classScope.freeVariable('ctor');
                assign = new Assign(new IdentifierLiteral(this.externalCtor), func);
              }
            } else {
              if (assign.variable["this"]) {
                func["static"] = true;
              } else {
                acc = base.isComplex() ? new Index(base) : new Access(base);
                assign.variable = new Value(new IdentifierLiteral(name), [new Access(new PropertyName('prototype')), acc]);
                if (func instanceof Code && func.bound) {
                  this.boundFuncs.push(base);
                  func.bound = false;
                }
              }
            }
          }
          results.push(assign);
        }
        return results;
      }).call(this);
      return compact(exprs);
    };

    Class.prototype.walkBody = function(name, o) {
      return this.traverseChildren(false, (function(_this) {
        return function(child) {
          var cont, exps, i, j, len1, node, ref3;
          cont = true;
          if (child instanceof Class) {
            return false;
          }
          if (child instanceof Block) {
            ref3 = exps = child.expressions;
            for (i = j = 0, len1 = ref3.length; j < len1; i = ++j) {
              node = ref3[i];
              if (node instanceof Assign && node.variable.looksStatic(name)) {
                node.value["static"] = true;
              } else if (node instanceof Value && node.isObject(true)) {
                cont = false;
                exps[i] = _this.addProperties(node, name, o);
              }
            }
            child.expressions = exps = flatten(exps);
          }
          return cont && !(child instanceof Class);
        };
      })(this));
    };

    Class.prototype.hoistDirectivePrologue = function() {
      var expressions, index, node;
      index = 0;
      expressions = this.body.expressions;
      while ((node = expressions[index]) && node instanceof Comment || node instanceof Value && node.isString()) {
        ++index;
      }
      return this.directives = expressions.splice(0, index);
    };

    Class.prototype.ensureConstructor = function(name) {
      if (!this.ctor) {
        this.ctor = new Code;
        if (this.externalCtor) {
          this.ctor.body.push(new Literal(this.externalCtor + ".apply(this, arguments)"));
        } else if (this.parent) {
          this.ctor.body.push(new Literal(name + ".__super__.constructor.apply(this, arguments)"));
        }
        this.ctor.body.makeReturn();
        this.body.expressions.unshift(this.ctor);
      }
      this.ctor.ctor = this.ctor.name = name;
      this.ctor.klass = null;
      return this.ctor.noReturn = true;
    };

    Class.prototype.compileNode = function(o) {
      var args, argumentsNode, func, jumpNode, klass, lname, name, ref3, superClass;
      if (jumpNode = this.body.jumps()) {
        jumpNode.error('Class bodies cannot contain pure statements');
      }
      if (argumentsNode = this.body.contains(isLiteralArguments)) {
        argumentsNode.error("Class bodies shouldn't reference arguments");
      }
      name = this.determineName();
      lname = new IdentifierLiteral(name);
      func = new Code([], Block.wrap([this.body]));
      args = [];
      o.classScope = func.makeScope(o.scope);
      this.hoistDirectivePrologue();
      this.setContext(name);
      this.walkBody(name, o);
      this.ensureConstructor(name);
      this.addBoundFunctions(o);
      this.body.spaced = true;
      this.body.expressions.push(lname);
      if (this.parent) {
        superClass = new IdentifierLiteral(o.classScope.freeVariable('superClass', {
          reserve: false
        }));
        this.body.expressions.unshift(new Extends(lname, superClass));
        func.params.push(new Param(superClass));
        args.push(this.parent);
      }
      (ref3 = this.body.expressions).unshift.apply(ref3, this.directives);
      klass = new Parens(new Call(func, args));
      if (this.variable) {
        klass = new Assign(this.variable, klass, null, {
          moduleDeclaration: this.moduleDeclaration
        });
      }
      return klass.compileToFragments(o);
    };

    return Class;

  })(Base);

  exports.ModuleDeclaration = ModuleDeclaration = (function(superClass1) {
    extend1(ModuleDeclaration, superClass1);

    function ModuleDeclaration(clause, source1) {
      this.clause = clause;
      this.source = source1;
      this.checkSource();
    }

    ModuleDeclaration.prototype.children = ['clause', 'source'];

    ModuleDeclaration.prototype.isStatement = YES;

    ModuleDeclaration.prototype.jumps = THIS;

    ModuleDeclaration.prototype.makeReturn = THIS;

    ModuleDeclaration.prototype.checkSource = function() {
      if ((this.source != null) && this.source instanceof StringWithInterpolations) {
        return this.source.error('the name of the module to be imported from must be an uninterpolated string');
      }
    };

    ModuleDeclaration.prototype.checkScope = function(o, moduleDeclarationType) {
      if (o.indent.length !== 0) {
        return this.error(moduleDeclarationType + " statements must be at top-level scope");
      }
    };

    return ModuleDeclaration;

  })(Base);

  exports.ImportDeclaration = ImportDeclaration = (function(superClass1) {
    extend1(ImportDeclaration, superClass1);

    function ImportDeclaration() {
      return ImportDeclaration.__super__.constructor.apply(this, arguments);
    }

    ImportDeclaration.prototype.compileNode = function(o) {
      var code, ref3;
      this.checkScope(o, 'import');
      o.importedSymbols = [];
      code = [];
      code.push(this.makeCode(this.tab + "import "));
      if (this.clause != null) {
        code.push.apply(code, this.clause.compileNode(o));
      }
      if (((ref3 = this.source) != null ? ref3.value : void 0) != null) {
        if (this.clause !== null) {
          code.push(this.makeCode(' from '));
        }
        code.push(this.makeCode(this.source.value));
      }
      code.push(this.makeCode(';'));
      return code;
    };

    return ImportDeclaration;

  })(ModuleDeclaration);

  exports.ImportClause = ImportClause = (function(superClass1) {
    extend1(ImportClause, superClass1);

    function ImportClause(defaultBinding, namedImports) {
      this.defaultBinding = defaultBinding;
      this.namedImports = namedImports;
    }

    ImportClause.prototype.children = ['defaultBinding', 'namedImports'];

    ImportClause.prototype.compileNode = function(o) {
      var code;
      code = [];
      if (this.defaultBinding != null) {
        code.push.apply(code, this.defaultBinding.compileNode(o));
        if (this.namedImports != null) {
          code.push(this.makeCode(', '));
        }
      }
      if (this.namedImports != null) {
        code.push.apply(code, this.namedImports.compileNode(o));
      }
      return code;
    };

    return ImportClause;

  })(Base);

  exports.ExportDeclaration = ExportDeclaration = (function(superClass1) {
    extend1(ExportDeclaration, superClass1);

    function ExportDeclaration() {
      return ExportDeclaration.__super__.constructor.apply(this, arguments);
    }

    ExportDeclaration.prototype.compileNode = function(o) {
      var code, ref3;
      this.checkScope(o, 'export');
      code = [];
      code.push(this.makeCode(this.tab + "export "));
      if (this instanceof ExportDefaultDeclaration) {
        code.push(this.makeCode('default '));
      }
      if (!(this instanceof ExportDefaultDeclaration) && (this.clause instanceof Assign || this.clause instanceof Class)) {
        if (this.clause instanceof Class && !this.clause.variable) {
          this.clause.error('anonymous classes cannot be exported');
        }
        code.push(this.makeCode('var '));
        this.clause.moduleDeclaration = 'export';
      }
      if ((this.clause.body != null) && this.clause.body instanceof Block) {
        code = code.concat(this.clause.compileToFragments(o, LEVEL_TOP));
      } else {
        code = code.concat(this.clause.compileNode(o));
      }
      if (((ref3 = this.source) != null ? ref3.value : void 0) != null) {
        code.push(this.makeCode(" from " + this.source.value));
      }
      code.push(this.makeCode(';'));
      return code;
    };

    return ExportDeclaration;

  })(ModuleDeclaration);

  exports.ExportNamedDeclaration = ExportNamedDeclaration = (function(superClass1) {
    extend1(ExportNamedDeclaration, superClass1);

    function ExportNamedDeclaration() {
      return ExportNamedDeclaration.__super__.constructor.apply(this, arguments);
    }

    return ExportNamedDeclaration;

  })(ExportDeclaration);

  exports.ExportDefaultDeclaration = ExportDefaultDeclaration = (function(superClass1) {
    extend1(ExportDefaultDeclaration, superClass1);

    function ExportDefaultDeclaration() {
      return ExportDefaultDeclaration.__super__.constructor.apply(this, arguments);
    }

    return ExportDefaultDeclaration;

  })(ExportDeclaration);

  exports.ExportAllDeclaration = ExportAllDeclaration = (function(superClass1) {
    extend1(ExportAllDeclaration, superClass1);

    function ExportAllDeclaration() {
      return ExportAllDeclaration.__super__.constructor.apply(this, arguments);
    }

    return ExportAllDeclaration;

  })(ExportDeclaration);

  exports.ModuleSpecifierList = ModuleSpecifierList = (function(superClass1) {
    extend1(ModuleSpecifierList, superClass1);

    function ModuleSpecifierList(specifiers) {
      this.specifiers = specifiers;
    }

    ModuleSpecifierList.prototype.children = ['specifiers'];

    ModuleSpecifierList.prototype.compileNode = function(o) {
      var code, compiledList, fragments, index, j, len1, specifier;
      code = [];
      o.indent += TAB;
      compiledList = (function() {
        var j, len1, ref3, results;
        ref3 = this.specifiers;
        results = [];
        for (j = 0, len1 = ref3.length; j < len1; j++) {
          specifier = ref3[j];
          results.push(specifier.compileToFragments(o, LEVEL_LIST));
        }
        return results;
      }).call(this);
      if (this.specifiers.length !== 0) {
        code.push(this.makeCode("{\n" + o.indent));
        for (index = j = 0, len1 = compiledList.length; j < len1; index = ++j) {
          fragments = compiledList[index];
          if (index) {
            code.push(this.makeCode(",\n" + o.indent));
          }
          code.push.apply(code, fragments);
        }
        code.push(this.makeCode("\n}"));
      } else {
        code.push(this.makeCode('{}'));
      }
      return code;
    };

    return ModuleSpecifierList;

  })(Base);

  exports.ImportSpecifierList = ImportSpecifierList = (function(superClass1) {
    extend1(ImportSpecifierList, superClass1);

    function ImportSpecifierList() {
      return ImportSpecifierList.__super__.constructor.apply(this, arguments);
    }

    return ImportSpecifierList;

  })(ModuleSpecifierList);

  exports.ExportSpecifierList = ExportSpecifierList = (function(superClass1) {
    extend1(ExportSpecifierList, superClass1);

    function ExportSpecifierList() {
      return ExportSpecifierList.__super__.constructor.apply(this, arguments);
    }

    return ExportSpecifierList;

  })(ModuleSpecifierList);

  exports.ModuleSpecifier = ModuleSpecifier = (function(superClass1) {
    extend1(ModuleSpecifier, superClass1);

    function ModuleSpecifier(original, alias, moduleDeclarationType1) {
      this.original = original;
      this.alias = alias;
      this.moduleDeclarationType = moduleDeclarationType1;
      this.identifier = this.alias != null ? this.alias.value : this.original.value;
    }

    ModuleSpecifier.prototype.children = ['original', 'alias'];

    ModuleSpecifier.prototype.compileNode = function(o) {
      var code;
      o.scope.add(this.identifier, this.moduleDeclarationType);
      code = [];
      code.push(this.makeCode(this.original.value));
      if (this.alias != null) {
        code.push(this.makeCode(" as " + this.alias.value));
      }
      return code;
    };

    return ModuleSpecifier;

  })(Base);

  exports.ImportSpecifier = ImportSpecifier = (function(superClass1) {
    extend1(ImportSpecifier, superClass1);

    function ImportSpecifier(imported, local) {
      ImportSpecifier.__super__.constructor.call(this, imported, local, 'import');
    }

    ImportSpecifier.prototype.compileNode = function(o) {
      var ref3;
      if ((ref3 = this.identifier, indexOf.call(o.importedSymbols, ref3) >= 0) || o.scope.check(this.identifier)) {
        this.error("'" + this.identifier + "' has already been declared");
      } else {
        o.importedSymbols.push(this.identifier);
      }
      return ImportSpecifier.__super__.compileNode.call(this, o);
    };

    return ImportSpecifier;

  })(ModuleSpecifier);

  exports.ImportDefaultSpecifier = ImportDefaultSpecifier = (function(superClass1) {
    extend1(ImportDefaultSpecifier, superClass1);

    function ImportDefaultSpecifier() {
      return ImportDefaultSpecifier.__super__.constructor.apply(this, arguments);
    }

    return ImportDefaultSpecifier;

  })(ImportSpecifier);

  exports.ImportNamespaceSpecifier = ImportNamespaceSpecifier = (function(superClass1) {
    extend1(ImportNamespaceSpecifier, superClass1);

    function ImportNamespaceSpecifier() {
      return ImportNamespaceSpecifier.__super__.constructor.apply(this, arguments);
    }

    return ImportNamespaceSpecifier;

  })(ImportSpecifier);

  exports.ExportSpecifier = ExportSpecifier = (function(superClass1) {
    extend1(ExportSpecifier, superClass1);

    function ExportSpecifier(local, exported) {
      ExportSpecifier.__super__.constructor.call(this, local, exported, 'export');
    }

    return ExportSpecifier;

  })(ModuleSpecifier);

  exports.Assign = Assign = (function(superClass1) {
    extend1(Assign, superClass1);

    function Assign(variable1, value1, context, options) {
      this.variable = variable1;
      this.value = value1;
      this.context = context;
      if (options == null) {
        options = {};
      }
      this.param = options.param, this.subpattern = options.subpattern, this.operatorToken = options.operatorToken, this.moduleDeclaration = options.moduleDeclaration;
    }

    Assign.prototype.children = ['variable', 'value'];

    Assign.prototype.isStatement = function(o) {
      return (o != null ? o.level : void 0) === LEVEL_TOP && (this.context != null) && (this.moduleDeclaration || indexOf.call(this.context, "?") >= 0);
    };

    Assign.prototype.checkAssignability = function(o, varBase) {
      if (Object.prototype.hasOwnProperty.call(o.scope.positions, varBase.value) && o.scope.variables[o.scope.positions[varBase.value]].type === 'import') {
        return varBase.error("'" + varBase.value + "' is read-only");
      }
    };

    Assign.prototype.assigns = function(name) {
      return this[this.context === 'object' ? 'value' : 'variable'].assigns(name);
    };

    Assign.prototype.unfoldSoak = function(o) {
      return unfoldSoak(o, this, 'variable');
    };

    Assign.prototype.compileNode = function(o) {
      var answer, compiledName, isValue, j, name, properties, prototype, ref3, ref4, ref5, ref6, ref7, ref8, val, varBase;
      if (isValue = this.variable instanceof Value) {
        if (this.variable.isArray() || this.variable.isObject()) {
          return this.compilePatternMatch(o);
        }
        if (this.variable.isSplice()) {
          return this.compileSplice(o);
        }
        if ((ref3 = this.context) === '||=' || ref3 === '&&=' || ref3 === '?=') {
          return this.compileConditional(o);
        }
        if ((ref4 = this.context) === '**=' || ref4 === '//=' || ref4 === '%%=') {
          return this.compileSpecialMath(o);
        }
      }
      if (this.value instanceof Code) {
        if (this.value["static"]) {
          this.value.klass = this.variable.base;
          this.value.name = this.variable.properties[0];
          this.value.variable = this.variable;
        } else if (((ref5 = this.variable.properties) != null ? ref5.length : void 0) >= 2) {
          ref6 = this.variable.properties, properties = 3 <= ref6.length ? slice.call(ref6, 0, j = ref6.length - 2) : (j = 0, []), prototype = ref6[j++], name = ref6[j++];
          if (((ref7 = prototype.name) != null ? ref7.value : void 0) === 'prototype') {
            this.value.klass = new Value(this.variable.base, properties);
            this.value.name = name;
            this.value.variable = this.variable;
          }
        }
      }
      if (!this.context) {
        varBase = this.variable.unwrapAll();
        if (!varBase.isAssignable()) {
          this.variable.error("'" + (this.variable.compile(o)) + "' can't be assigned");
        }
        if (!(typeof varBase.hasProperties === "function" ? varBase.hasProperties() : void 0)) {
          if (this.moduleDeclaration) {
            this.checkAssignability(o, varBase);
            o.scope.add(varBase.value, this.moduleDeclaration);
          } else if (this.param) {
            o.scope.add(varBase.value, 'var');
          } else {
            this.checkAssignability(o, varBase);
            o.scope.find(varBase.value);
          }
        }
      }
      val = this.value.compileToFragments(o, LEVEL_LIST);
      if (isValue && this.variable.base instanceof Obj) {
        this.variable.front = true;
      }
      compiledName = this.variable.compileToFragments(o, LEVEL_LIST);
      if (this.context === 'object') {
        if (ref8 = fragmentsToText(compiledName), indexOf.call(JS_FORBIDDEN, ref8) >= 0) {
          compiledName.unshift(this.makeCode('"'));
          compiledName.push(this.makeCode('"'));
        }
        return compiledName.concat(this.makeCode(": "), val);
      }
      answer = compiledName.concat(this.makeCode(" " + (this.context || '=') + " "), val);
      if (o.level <= LEVEL_LIST) {
        return answer;
      } else {
        return this.wrapInBraces(answer);
      }
    };

    Assign.prototype.compilePatternMatch = function(o) {
      var acc, assigns, code, defaultValue, expandedIdx, fragments, i, idx, isObject, ivar, j, len1, message, name, obj, objects, olen, ref, ref3, ref4, ref5, ref6, rest, top, val, value, vvar, vvarText;
      top = o.level === LEVEL_TOP;
      value = this.value;
      objects = this.variable.base.objects;
      if (!(olen = objects.length)) {
        code = value.compileToFragments(o);
        if (o.level >= LEVEL_OP) {
          return this.wrapInBraces(code);
        } else {
          return code;
        }
      }
      obj = objects[0];
      if (olen === 1 && obj instanceof Expansion) {
        obj.error('Destructuring assignment has no target');
      }
      isObject = this.variable.isObject();
      if (top && olen === 1 && !(obj instanceof Splat)) {
        defaultValue = null;
        if (obj instanceof Assign && obj.context === 'object') {
          ref3 = obj, (ref4 = ref3.variable, idx = ref4.base), obj = ref3.value;
          if (obj instanceof Assign) {
            defaultValue = obj.value;
            obj = obj.variable;
          }
        } else {
          if (obj instanceof Assign) {
            defaultValue = obj.value;
            obj = obj.variable;
          }
          idx = isObject ? obj["this"] ? obj.properties[0].name : new PropertyName(obj.unwrap().value) : new NumberLiteral(0);
        }
        acc = idx.unwrap() instanceof PropertyName;
        value = new Value(value);
        value.properties.push(new (acc ? Access : Index)(idx));
        message = isUnassignable(obj.unwrap().value);
        if (message) {
          obj.error(message);
        }
        if (defaultValue) {
          value = new Op('?', value, defaultValue);
        }
        return new Assign(obj, value, null, {
          param: this.param
        }).compileToFragments(o, LEVEL_TOP);
      }
      vvar = value.compileToFragments(o, LEVEL_LIST);
      vvarText = fragmentsToText(vvar);
      assigns = [];
      expandedIdx = false;
      if (!(value.unwrap() instanceof IdentifierLiteral) || this.variable.assigns(vvarText)) {
        assigns.push([this.makeCode((ref = o.scope.freeVariable('ref')) + " = ")].concat(slice.call(vvar)));
        vvar = [this.makeCode(ref)];
        vvarText = ref;
      }
      for (i = j = 0, len1 = objects.length; j < len1; i = ++j) {
        obj = objects[i];
        idx = i;
        if (!expandedIdx && obj instanceof Splat) {
          name = obj.name.unwrap().value;
          obj = obj.unwrap();
          val = olen + " <= " + vvarText + ".length ? " + (utility('slice', o)) + ".call(" + vvarText + ", " + i;
          if (rest = olen - i - 1) {
            ivar = o.scope.freeVariable('i', {
              single: true
            });
            val += ", " + ivar + " = " + vvarText + ".length - " + rest + ") : (" + ivar + " = " + i + ", [])";
          } else {
            val += ") : []";
          }
          val = new Literal(val);
          expandedIdx = ivar + "++";
        } else if (!expandedIdx && obj instanceof Expansion) {
          if (rest = olen - i - 1) {
            if (rest === 1) {
              expandedIdx = vvarText + ".length - 1";
            } else {
              ivar = o.scope.freeVariable('i', {
                single: true
              });
              val = new Literal(ivar + " = " + vvarText + ".length - " + rest);
              expandedIdx = ivar + "++";
              assigns.push(val.compileToFragments(o, LEVEL_LIST));
            }
          }
          continue;
        } else {
          if (obj instanceof Splat || obj instanceof Expansion) {
            obj.error("multiple splats/expansions are disallowed in an assignment");
          }
          defaultValue = null;
          if (obj instanceof Assign && obj.context === 'object') {
            ref5 = obj, (ref6 = ref5.variable, idx = ref6.base), obj = ref5.value;
            if (obj instanceof Assign) {
              defaultValue = obj.value;
              obj = obj.variable;
            }
          } else {
            if (obj instanceof Assign) {
              defaultValue = obj.value;
              obj = obj.variable;
            }
            idx = isObject ? obj["this"] ? obj.properties[0].name : new PropertyName(obj.unwrap().value) : new Literal(expandedIdx || idx);
          }
          name = obj.unwrap().value;
          acc = idx.unwrap() instanceof PropertyName;
          val = new Value(new Literal(vvarText), [new (acc ? Access : Index)(idx)]);
          if (defaultValue) {
            val = new Op('?', val, defaultValue);
          }
        }
        if (name != null) {
          message = isUnassignable(name);
          if (message) {
            obj.error(message);
          }
        }
        assigns.push(new Assign(obj, val, null, {
          param: this.param,
          subpattern: true
        }).compileToFragments(o, LEVEL_LIST));
      }
      if (!(top || this.subpattern)) {
        assigns.push(vvar);
      }
      fragments = this.joinFragmentArrays(assigns, ', ');
      if (o.level < LEVEL_LIST) {
        return fragments;
      } else {
        return this.wrapInBraces(fragments);
      }
    };

    Assign.prototype.compileConditional = function(o) {
      var fragments, left, ref3, right;
      ref3 = this.variable.cacheReference(o), left = ref3[0], right = ref3[1];
      if (!left.properties.length && left.base instanceof Literal && !(left.base instanceof ThisLiteral) && !o.scope.check(left.base.value)) {
        this.variable.error("the variable \"" + left.base.value + "\" can't be assigned with " + this.context + " because it has not been declared before");
      }
      if (indexOf.call(this.context, "?") >= 0) {
        o.isExistentialEquals = true;
        return new If(new Existence(left), right, {
          type: 'if'
        }).addElse(new Assign(right, this.value, '=')).compileToFragments(o);
      } else {
        fragments = new Op(this.context.slice(0, -1), left, new Assign(right, this.value, '=')).compileToFragments(o);
        if (o.level <= LEVEL_LIST) {
          return fragments;
        } else {
          return this.wrapInBraces(fragments);
        }
      }
    };

    Assign.prototype.compileSpecialMath = function(o) {
      var left, ref3, right;
      ref3 = this.variable.cacheReference(o), left = ref3[0], right = ref3[1];
      return new Assign(left, new Op(this.context.slice(0, -1), right, this.value)).compileToFragments(o);
    };

    Assign.prototype.compileSplice = function(o) {
      var answer, exclusive, from, fromDecl, fromRef, name, ref3, ref4, ref5, to, valDef, valRef;
      ref3 = this.variable.properties.pop().range, from = ref3.from, to = ref3.to, exclusive = ref3.exclusive;
      name = this.variable.compile(o);
      if (from) {
        ref4 = this.cacheToCodeFragments(from.cache(o, LEVEL_OP)), fromDecl = ref4[0], fromRef = ref4[1];
      } else {
        fromDecl = fromRef = '0';
      }
      if (to) {
        if ((from != null ? from.isNumber() : void 0) && to.isNumber()) {
          to = to.compile(o) - fromRef;
          if (!exclusive) {
            to += 1;
          }
        } else {
          to = to.compile(o, LEVEL_ACCESS) + ' - ' + fromRef;
          if (!exclusive) {
            to += ' + 1';
          }
        }
      } else {
        to = "9e9";
      }
      ref5 = this.value.cache(o, LEVEL_LIST), valDef = ref5[0], valRef = ref5[1];
      answer = [].concat(this.makeCode("[].splice.apply(" + name + ", [" + fromDecl + ", " + to + "].concat("), valDef, this.makeCode(")), "), valRef);
      if (o.level > LEVEL_TOP) {
        return this.wrapInBraces(answer);
      } else {
        return answer;
      }
    };

    return Assign;

  })(Base);

  exports.Code = Code = (function(superClass1) {
    extend1(Code, superClass1);

    function Code(params, body, tag) {
      this.params = params || [];
      this.body = body || new Block;
      this.bound = tag === 'boundfunc';
      this.isGenerator = !!this.body.contains(function(node) {
        return (node instanceof Op && node.isYield()) || node instanceof YieldReturn;
      });
    }

    Code.prototype.children = ['params', 'body'];

    Code.prototype.isStatement = function() {
      return !!this.ctor;
    };

    Code.prototype.jumps = NO;

    Code.prototype.makeScope = function(parentScope) {
      return new Scope(parentScope, this.body, this);
    };

    Code.prototype.compileNode = function(o) {
      var answer, boundfunc, code, exprs, i, j, k, l, len1, len2, len3, len4, len5, len6, lit, m, p, param, params, q, r, ref, ref3, ref4, ref5, ref6, ref7, ref8, splats, uniqs, val, wasEmpty, wrapper;
      if (this.bound && ((ref3 = o.scope.method) != null ? ref3.bound : void 0)) {
        this.context = o.scope.method.context;
      }
      if (this.bound && !this.context) {
        this.context = '_this';
        wrapper = new Code([new Param(new IdentifierLiteral(this.context))], new Block([this]));
        boundfunc = new Call(wrapper, [new ThisLiteral]);
        boundfunc.updateLocationDataIfMissing(this.locationData);
        return boundfunc.compileNode(o);
      }
      o.scope = del(o, 'classScope') || this.makeScope(o.scope);
      o.scope.shared = del(o, 'sharedScope');
      o.indent += TAB;
      delete o.bare;
      delete o.isExistentialEquals;
      params = [];
      exprs = [];
      ref4 = this.params;
      for (j = 0, len1 = ref4.length; j < len1; j++) {
        param = ref4[j];
        if (!(param instanceof Expansion)) {
          o.scope.parameter(param.asReference(o));
        }
      }
      ref5 = this.params;
      for (k = 0, len2 = ref5.length; k < len2; k++) {
        param = ref5[k];
        if (!(param.splat || param instanceof Expansion)) {
          continue;
        }
        ref6 = this.params;
        for (l = 0, len3 = ref6.length; l < len3; l++) {
          p = ref6[l];
          if (!(p instanceof Expansion) && p.name.value) {
            o.scope.add(p.name.value, 'var', true);
          }
        }
        splats = new Assign(new Value(new Arr((function() {
          var len4, m, ref7, results;
          ref7 = this.params;
          results = [];
          for (m = 0, len4 = ref7.length; m < len4; m++) {
            p = ref7[m];
            results.push(p.asReference(o));
          }
          return results;
        }).call(this))), new Value(new IdentifierLiteral('arguments')));
        break;
      }
      ref7 = this.params;
      for (m = 0, len4 = ref7.length; m < len4; m++) {
        param = ref7[m];
        if (param.isComplex()) {
          val = ref = param.asReference(o);
          if (param.value) {
            val = new Op('?', ref, param.value);
          }
          exprs.push(new Assign(new Value(param.name), val, '=', {
            param: true
          }));
        } else {
          ref = param;
          if (param.value) {
            lit = new Literal(ref.name.value + ' == null');
            val = new Assign(new Value(param.name), param.value, '=');
            exprs.push(new If(lit, val));
          }
        }
        if (!splats) {
          params.push(ref);
        }
      }
      wasEmpty = this.body.isEmpty();
      if (splats) {
        exprs.unshift(splats);
      }
      if (exprs.length) {
        (ref8 = this.body.expressions).unshift.apply(ref8, exprs);
      }
      for (i = q = 0, len5 = params.length; q < len5; i = ++q) {
        p = params[i];
        params[i] = p.compileToFragments(o);
        o.scope.parameter(fragmentsToText(params[i]));
      }
      uniqs = [];
      this.eachParamName(function(name, node) {
        if (indexOf.call(uniqs, name) >= 0) {
          node.error("multiple parameters named " + name);
        }
        return uniqs.push(name);
      });
      if (!(wasEmpty || this.noReturn)) {
        this.body.makeReturn();
      }
      code = 'function';
      if (this.isGenerator) {
        code += '*';
      }
      if (this.ctor) {
        code += ' ' + this.name;
      }
      code += '(';
      answer = [this.makeCode(code)];
      for (i = r = 0, len6 = params.length; r < len6; i = ++r) {
        p = params[i];
        if (i) {
          answer.push(this.makeCode(", "));
        }
        answer.push.apply(answer, p);
      }
      answer.push(this.makeCode(') {'));
      if (!this.body.isEmpty()) {
        answer = answer.concat(this.makeCode("\n"), this.body.compileWithDeclarations(o), this.makeCode("\n" + this.tab));
      }
      answer.push(this.makeCode('}'));
      if (this.ctor) {
        return [this.makeCode(this.tab)].concat(slice.call(answer));
      }
      if (this.front || (o.level >= LEVEL_ACCESS)) {
        return this.wrapInBraces(answer);
      } else {
        return answer;
      }
    };

    Code.prototype.eachParamName = function(iterator) {
      var j, len1, param, ref3, results;
      ref3 = this.params;
      results = [];
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        param = ref3[j];
        results.push(param.eachName(iterator));
      }
      return results;
    };

    Code.prototype.traverseChildren = function(crossScope, func) {
      if (crossScope) {
        return Code.__super__.traverseChildren.call(this, crossScope, func);
      }
    };

    return Code;

  })(Base);

  exports.Param = Param = (function(superClass1) {
    extend1(Param, superClass1);

    function Param(name1, value1, splat) {
      var message, token;
      this.name = name1;
      this.value = value1;
      this.splat = splat;
      message = isUnassignable(this.name.unwrapAll().value);
      if (message) {
        this.name.error(message);
      }
      if (this.name instanceof Obj && this.name.generated) {
        token = this.name.objects[0].operatorToken;
        token.error("unexpected " + token.value);
      }
    }

    Param.prototype.children = ['name', 'value'];

    Param.prototype.compileToFragments = function(o) {
      return this.name.compileToFragments(o, LEVEL_LIST);
    };

    Param.prototype.asReference = function(o) {
      var name, node;
      if (this.reference) {
        return this.reference;
      }
      node = this.name;
      if (node["this"]) {
        name = node.properties[0].name.value;
        if (indexOf.call(JS_FORBIDDEN, name) >= 0) {
          name = "_" + name;
        }
        node = new IdentifierLiteral(o.scope.freeVariable(name));
      } else if (node.isComplex()) {
        node = new IdentifierLiteral(o.scope.freeVariable('arg'));
      }
      node = new Value(node);
      if (this.splat) {
        node = new Splat(node);
      }
      node.updateLocationDataIfMissing(this.locationData);
      return this.reference = node;
    };

    Param.prototype.isComplex = function() {
      return this.name.isComplex();
    };

    Param.prototype.eachName = function(iterator, name) {
      var atParam, j, len1, node, obj, ref3, ref4;
      if (name == null) {
        name = this.name;
      }
      atParam = function(obj) {
        return iterator("@" + obj.properties[0].name.value, obj);
      };
      if (name instanceof Literal) {
        return iterator(name.value, name);
      }
      if (name instanceof Value) {
        return atParam(name);
      }
      ref4 = (ref3 = name.objects) != null ? ref3 : [];
      for (j = 0, len1 = ref4.length; j < len1; j++) {
        obj = ref4[j];
        if (obj instanceof Assign && (obj.context == null)) {
          obj = obj.variable;
        }
        if (obj instanceof Assign) {
          if (obj.value instanceof Assign) {
            obj = obj.value;
          }
          this.eachName(iterator, obj.value.unwrap());
        } else if (obj instanceof Splat) {
          node = obj.name.unwrap();
          iterator(node.value, node);
        } else if (obj instanceof Value) {
          if (obj.isArray() || obj.isObject()) {
            this.eachName(iterator, obj.base);
          } else if (obj["this"]) {
            atParam(obj);
          } else {
            iterator(obj.base.value, obj.base);
          }
        } else if (!(obj instanceof Expansion)) {
          obj.error("illegal parameter " + (obj.compile()));
        }
      }
    };

    return Param;

  })(Base);

  exports.Splat = Splat = (function(superClass1) {
    extend1(Splat, superClass1);

    Splat.prototype.children = ['name'];

    Splat.prototype.isAssignable = YES;

    function Splat(name) {
      this.name = name.compile ? name : new Literal(name);
    }

    Splat.prototype.assigns = function(name) {
      return this.name.assigns(name);
    };

    Splat.prototype.compileToFragments = function(o) {
      return this.name.compileToFragments(o);
    };

    Splat.prototype.unwrap = function() {
      return this.name;
    };

    Splat.compileSplattedArray = function(o, list, apply) {
      var args, base, compiledNode, concatPart, fragments, i, index, j, last, len1, node;
      index = -1;
      while ((node = list[++index]) && !(node instanceof Splat)) {
        continue;
      }
      if (index >= list.length) {
        return [];
      }
      if (list.length === 1) {
        node = list[0];
        fragments = node.compileToFragments(o, LEVEL_LIST);
        if (apply) {
          return fragments;
        }
        return [].concat(node.makeCode((utility('slice', o)) + ".call("), fragments, node.makeCode(")"));
      }
      args = list.slice(index);
      for (i = j = 0, len1 = args.length; j < len1; i = ++j) {
        node = args[i];
        compiledNode = node.compileToFragments(o, LEVEL_LIST);
        args[i] = node instanceof Splat ? [].concat(node.makeCode((utility('slice', o)) + ".call("), compiledNode, node.makeCode(")")) : [].concat(node.makeCode("["), compiledNode, node.makeCode("]"));
      }
      if (index === 0) {
        node = list[0];
        concatPart = node.joinFragmentArrays(args.slice(1), ', ');
        return args[0].concat(node.makeCode(".concat("), concatPart, node.makeCode(")"));
      }
      base = (function() {
        var k, len2, ref3, results;
        ref3 = list.slice(0, index);
        results = [];
        for (k = 0, len2 = ref3.length; k < len2; k++) {
          node = ref3[k];
          results.push(node.compileToFragments(o, LEVEL_LIST));
        }
        return results;
      })();
      base = list[0].joinFragmentArrays(base, ', ');
      concatPart = list[index].joinFragmentArrays(args, ', ');
      last = list[list.length - 1];
      return [].concat(list[0].makeCode("["), base, list[index].makeCode("].concat("), concatPart, last.makeCode(")"));
    };

    return Splat;

  })(Base);

  exports.Expansion = Expansion = (function(superClass1) {
    extend1(Expansion, superClass1);

    function Expansion() {
      return Expansion.__super__.constructor.apply(this, arguments);
    }

    Expansion.prototype.isComplex = NO;

    Expansion.prototype.compileNode = function(o) {
      return this.error('Expansion must be used inside a destructuring assignment or parameter list');
    };

    Expansion.prototype.asReference = function(o) {
      return this;
    };

    Expansion.prototype.eachName = function(iterator) {};

    return Expansion;

  })(Base);

  exports.While = While = (function(superClass1) {
    extend1(While, superClass1);

    function While(condition, options) {
      this.condition = (options != null ? options.invert : void 0) ? condition.invert() : condition;
      this.guard = options != null ? options.guard : void 0;
    }

    While.prototype.children = ['condition', 'guard', 'body'];

    While.prototype.isStatement = YES;

    While.prototype.makeReturn = function(res) {
      if (res) {
        return While.__super__.makeReturn.apply(this, arguments);
      } else {
        this.returns = !this.jumps({
          loop: true
        });
        return this;
      }
    };

    While.prototype.addBody = function(body1) {
      this.body = body1;
      return this;
    };

    While.prototype.jumps = function() {
      var expressions, j, jumpNode, len1, node;
      expressions = this.body.expressions;
      if (!expressions.length) {
        return false;
      }
      for (j = 0, len1 = expressions.length; j < len1; j++) {
        node = expressions[j];
        if (jumpNode = node.jumps({
          loop: true
        })) {
          return jumpNode;
        }
      }
      return false;
    };

    While.prototype.compileNode = function(o) {
      var answer, body, rvar, set;
      o.indent += TAB;
      set = '';
      body = this.body;
      if (body.isEmpty()) {
        body = this.makeCode('');
      } else {
        if (this.returns) {
          body.makeReturn(rvar = o.scope.freeVariable('results'));
          set = "" + this.tab + rvar + " = [];\n";
        }
        if (this.guard) {
          if (body.expressions.length > 1) {
            body.expressions.unshift(new If((new Parens(this.guard)).invert(), new StatementLiteral("continue")));
          } else {
            if (this.guard) {
              body = Block.wrap([new If(this.guard, body)]);
            }
          }
        }
        body = [].concat(this.makeCode("\n"), body.compileToFragments(o, LEVEL_TOP), this.makeCode("\n" + this.tab));
      }
      answer = [].concat(this.makeCode(set + this.tab + "while ("), this.condition.compileToFragments(o, LEVEL_PAREN), this.makeCode(") {"), body, this.makeCode("}"));
      if (this.returns) {
        answer.push(this.makeCode("\n" + this.tab + "return " + rvar + ";"));
      }
      return answer;
    };

    return While;

  })(Base);

  exports.Op = Op = (function(superClass1) {
    var CONVERSIONS, INVERSIONS;

    extend1(Op, superClass1);

    function Op(op, first, second, flip) {
      if (op === 'in') {
        return new In(first, second);
      }
      if (op === 'do') {
        return this.generateDo(first);
      }
      if (op === 'new') {
        if (first instanceof Call && !first["do"] && !first.isNew) {
          return first.newInstance();
        }
        if (first instanceof Code && first.bound || first["do"]) {
          first = new Parens(first);
        }
      }
      this.operator = CONVERSIONS[op] || op;
      this.first = first;
      this.second = second;
      this.flip = !!flip;
      return this;
    }

    CONVERSIONS = {
      '==': '===',
      '!=': '!==',
      'of': 'in',
      'yieldfrom': 'yield*'
    };

    INVERSIONS = {
      '!==': '===',
      '===': '!=='
    };

    Op.prototype.children = ['first', 'second'];

    Op.prototype.isNumber = function() {
      var ref3;
      return this.isUnary() && ((ref3 = this.operator) === '+' || ref3 === '-') && this.first instanceof Value && this.first.isNumber();
    };

    Op.prototype.isYield = function() {
      var ref3;
      return (ref3 = this.operator) === 'yield' || ref3 === 'yield*';
    };

    Op.prototype.isUnary = function() {
      return !this.second;
    };

    Op.prototype.isComplex = function() {
      return !this.isNumber();
    };

    Op.prototype.isChainable = function() {
      var ref3;
      return (ref3 = this.operator) === '<' || ref3 === '>' || ref3 === '>=' || ref3 === '<=' || ref3 === '===' || ref3 === '!==';
    };

    Op.prototype.invert = function() {
      var allInvertable, curr, fst, op, ref3;
      if (this.isChainable() && this.first.isChainable()) {
        allInvertable = true;
        curr = this;
        while (curr && curr.operator) {
          allInvertable && (allInvertable = curr.operator in INVERSIONS);
          curr = curr.first;
        }
        if (!allInvertable) {
          return new Parens(this).invert();
        }
        curr = this;
        while (curr && curr.operator) {
          curr.invert = !curr.invert;
          curr.operator = INVERSIONS[curr.operator];
          curr = curr.first;
        }
        return this;
      } else if (op = INVERSIONS[this.operator]) {
        this.operator = op;
        if (this.first.unwrap() instanceof Op) {
          this.first.invert();
        }
        return this;
      } else if (this.second) {
        return new Parens(this).invert();
      } else if (this.operator === '!' && (fst = this.first.unwrap()) instanceof Op && ((ref3 = fst.operator) === '!' || ref3 === 'in' || ref3 === 'instanceof')) {
        return fst;
      } else {
        return new Op('!', this);
      }
    };

    Op.prototype.unfoldSoak = function(o) {
      var ref3;
      return ((ref3 = this.operator) === '++' || ref3 === '--' || ref3 === 'delete') && unfoldSoak(o, this, 'first');
    };

    Op.prototype.generateDo = function(exp) {
      var call, func, j, len1, param, passedParams, ref, ref3;
      passedParams = [];
      func = exp instanceof Assign && (ref = exp.value.unwrap()) instanceof Code ? ref : exp;
      ref3 = func.params || [];
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        param = ref3[j];
        if (param.value) {
          passedParams.push(param.value);
          delete param.value;
        } else {
          passedParams.push(param);
        }
      }
      call = new Call(exp, passedParams);
      call["do"] = true;
      return call;
    };

    Op.prototype.compileNode = function(o) {
      var answer, isChain, lhs, message, ref3, rhs;
      isChain = this.isChainable() && this.first.isChainable();
      if (!isChain) {
        this.first.front = this.front;
      }
      if (this.operator === 'delete' && o.scope.check(this.first.unwrapAll().value)) {
        this.error('delete operand may not be argument or var');
      }
      if ((ref3 = this.operator) === '--' || ref3 === '++') {
        message = isUnassignable(this.first.unwrapAll().value);
        if (message) {
          this.first.error(message);
        }
      }
      if (this.isYield()) {
        return this.compileYield(o);
      }
      if (this.isUnary()) {
        return this.compileUnary(o);
      }
      if (isChain) {
        return this.compileChain(o);
      }
      switch (this.operator) {
        case '?':
          return this.compileExistence(o);
        case '**':
          return this.compilePower(o);
        case '//':
          return this.compileFloorDivision(o);
        case '%%':
          return this.compileModulo(o);
        default:
          lhs = this.first.compileToFragments(o, LEVEL_OP);
          rhs = this.second.compileToFragments(o, LEVEL_OP);
          answer = [].concat(lhs, this.makeCode(" " + this.operator + " "), rhs);
          if (o.level <= LEVEL_OP) {
            return answer;
          } else {
            return this.wrapInBraces(answer);
          }
      }
    };

    Op.prototype.compileChain = function(o) {
      var fragments, fst, ref3, shared;
      ref3 = this.first.second.cache(o), this.first.second = ref3[0], shared = ref3[1];
      fst = this.first.compileToFragments(o, LEVEL_OP);
      fragments = fst.concat(this.makeCode(" " + (this.invert ? '&&' : '||') + " "), shared.compileToFragments(o), this.makeCode(" " + this.operator + " "), this.second.compileToFragments(o, LEVEL_OP));
      return this.wrapInBraces(fragments);
    };

    Op.prototype.compileExistence = function(o) {
      var fst, ref;
      if (this.first.isComplex()) {
        ref = new IdentifierLiteral(o.scope.freeVariable('ref'));
        fst = new Parens(new Assign(ref, this.first));
      } else {
        fst = this.first;
        ref = fst;
      }
      return new If(new Existence(fst), ref, {
        type: 'if'
      }).addElse(this.second).compileToFragments(o);
    };

    Op.prototype.compileUnary = function(o) {
      var op, parts, plusMinus;
      parts = [];
      op = this.operator;
      parts.push([this.makeCode(op)]);
      if (op === '!' && this.first instanceof Existence) {
        this.first.negated = !this.first.negated;
        return this.first.compileToFragments(o);
      }
      if (o.level >= LEVEL_ACCESS) {
        return (new Parens(this)).compileToFragments(o);
      }
      plusMinus = op === '+' || op === '-';
      if ((op === 'new' || op === 'typeof' || op === 'delete') || plusMinus && this.first instanceof Op && this.first.operator === op) {
        parts.push([this.makeCode(' ')]);
      }
      if ((plusMinus && this.first instanceof Op) || (op === 'new' && this.first.isStatement(o))) {
        this.first = new Parens(this.first);
      }
      parts.push(this.first.compileToFragments(o, LEVEL_OP));
      if (this.flip) {
        parts.reverse();
      }
      return this.joinFragmentArrays(parts, '');
    };

    Op.prototype.compileYield = function(o) {
      var op, parts, ref3;
      parts = [];
      op = this.operator;
      if (o.scope.parent == null) {
        this.error('yield can only occur inside functions');
      }
      if (indexOf.call(Object.keys(this.first), 'expression') >= 0 && !(this.first instanceof Throw)) {
        if (this.first.expression != null) {
          parts.push(this.first.expression.compileToFragments(o, LEVEL_OP));
        }
      } else {
        if (o.level >= LEVEL_PAREN) {
          parts.push([this.makeCode("(")]);
        }
        parts.push([this.makeCode(op)]);
        if (((ref3 = this.first.base) != null ? ref3.value : void 0) !== '') {
          parts.push([this.makeCode(" ")]);
        }
        parts.push(this.first.compileToFragments(o, LEVEL_OP));
        if (o.level >= LEVEL_PAREN) {
          parts.push([this.makeCode(")")]);
        }
      }
      return this.joinFragmentArrays(parts, '');
    };

    Op.prototype.compilePower = function(o) {
      var pow;
      pow = new Value(new IdentifierLiteral('Math'), [new Access(new PropertyName('pow'))]);
      return new Call(pow, [this.first, this.second]).compileToFragments(o);
    };

    Op.prototype.compileFloorDivision = function(o) {
      var div, floor;
      floor = new Value(new IdentifierLiteral('Math'), [new Access(new PropertyName('floor'))]);
      div = new Op('/', this.first, this.second);
      return new Call(floor, [div]).compileToFragments(o);
    };

    Op.prototype.compileModulo = function(o) {
      var mod;
      mod = new Value(new Literal(utility('modulo', o)));
      return new Call(mod, [this.first, this.second]).compileToFragments(o);
    };

    Op.prototype.toString = function(idt) {
      return Op.__super__.toString.call(this, idt, this.constructor.name + ' ' + this.operator);
    };

    return Op;

  })(Base);

  exports.In = In = (function(superClass1) {
    extend1(In, superClass1);

    function In(object, array) {
      this.object = object;
      this.array = array;
    }

    In.prototype.children = ['object', 'array'];

    In.prototype.invert = NEGATE;

    In.prototype.compileNode = function(o) {
      var hasSplat, j, len1, obj, ref3;
      if (this.array instanceof Value && this.array.isArray() && this.array.base.objects.length) {
        ref3 = this.array.base.objects;
        for (j = 0, len1 = ref3.length; j < len1; j++) {
          obj = ref3[j];
          if (!(obj instanceof Splat)) {
            continue;
          }
          hasSplat = true;
          break;
        }
        if (!hasSplat) {
          return this.compileOrTest(o);
        }
      }
      return this.compileLoopTest(o);
    };

    In.prototype.compileOrTest = function(o) {
      var cmp, cnj, i, item, j, len1, ref, ref3, ref4, ref5, sub, tests;
      ref3 = this.object.cache(o, LEVEL_OP), sub = ref3[0], ref = ref3[1];
      ref4 = this.negated ? [' !== ', ' && '] : [' === ', ' || '], cmp = ref4[0], cnj = ref4[1];
      tests = [];
      ref5 = this.array.base.objects;
      for (i = j = 0, len1 = ref5.length; j < len1; i = ++j) {
        item = ref5[i];
        if (i) {
          tests.push(this.makeCode(cnj));
        }
        tests = tests.concat((i ? ref : sub), this.makeCode(cmp), item.compileToFragments(o, LEVEL_ACCESS));
      }
      if (o.level < LEVEL_OP) {
        return tests;
      } else {
        return this.wrapInBraces(tests);
      }
    };

    In.prototype.compileLoopTest = function(o) {
      var fragments, ref, ref3, sub;
      ref3 = this.object.cache(o, LEVEL_LIST), sub = ref3[0], ref = ref3[1];
      fragments = [].concat(this.makeCode(utility('indexOf', o) + ".call("), this.array.compileToFragments(o, LEVEL_LIST), this.makeCode(", "), ref, this.makeCode(") " + (this.negated ? '< 0' : '>= 0')));
      if (fragmentsToText(sub) === fragmentsToText(ref)) {
        return fragments;
      }
      fragments = sub.concat(this.makeCode(', '), fragments);
      if (o.level < LEVEL_LIST) {
        return fragments;
      } else {
        return this.wrapInBraces(fragments);
      }
    };

    In.prototype.toString = function(idt) {
      return In.__super__.toString.call(this, idt, this.constructor.name + (this.negated ? '!' : ''));
    };

    return In;

  })(Base);

  exports.Try = Try = (function(superClass1) {
    extend1(Try, superClass1);

    function Try(attempt, errorVariable, recovery, ensure) {
      this.attempt = attempt;
      this.errorVariable = errorVariable;
      this.recovery = recovery;
      this.ensure = ensure;
    }

    Try.prototype.children = ['attempt', 'recovery', 'ensure'];

    Try.prototype.isStatement = YES;

    Try.prototype.jumps = function(o) {
      var ref3;
      return this.attempt.jumps(o) || ((ref3 = this.recovery) != null ? ref3.jumps(o) : void 0);
    };

    Try.prototype.makeReturn = function(res) {
      if (this.attempt) {
        this.attempt = this.attempt.makeReturn(res);
      }
      if (this.recovery) {
        this.recovery = this.recovery.makeReturn(res);
      }
      return this;
    };

    Try.prototype.compileNode = function(o) {
      var catchPart, ensurePart, generatedErrorVariableName, message, placeholder, tryPart;
      o.indent += TAB;
      tryPart = this.attempt.compileToFragments(o, LEVEL_TOP);
      catchPart = this.recovery ? (generatedErrorVariableName = o.scope.freeVariable('error', {
        reserve: false
      }), placeholder = new IdentifierLiteral(generatedErrorVariableName), this.errorVariable ? (message = isUnassignable(this.errorVariable.unwrapAll().value), message ? this.errorVariable.error(message) : void 0, this.recovery.unshift(new Assign(this.errorVariable, placeholder))) : void 0, [].concat(this.makeCode(" catch ("), placeholder.compileToFragments(o), this.makeCode(") {\n"), this.recovery.compileToFragments(o, LEVEL_TOP), this.makeCode("\n" + this.tab + "}"))) : !(this.ensure || this.recovery) ? (generatedErrorVariableName = o.scope.freeVariable('error', {
        reserve: false
      }), [this.makeCode(" catch (" + generatedErrorVariableName + ") {}")]) : [];
      ensurePart = this.ensure ? [].concat(this.makeCode(" finally {\n"), this.ensure.compileToFragments(o, LEVEL_TOP), this.makeCode("\n" + this.tab + "}")) : [];
      return [].concat(this.makeCode(this.tab + "try {\n"), tryPart, this.makeCode("\n" + this.tab + "}"), catchPart, ensurePart);
    };

    return Try;

  })(Base);

  exports.Throw = Throw = (function(superClass1) {
    extend1(Throw, superClass1);

    function Throw(expression) {
      this.expression = expression;
    }

    Throw.prototype.children = ['expression'];

    Throw.prototype.isStatement = YES;

    Throw.prototype.jumps = NO;

    Throw.prototype.makeReturn = THIS;

    Throw.prototype.compileNode = function(o) {
      return [].concat(this.makeCode(this.tab + "throw "), this.expression.compileToFragments(o), this.makeCode(";"));
    };

    return Throw;

  })(Base);

  exports.Existence = Existence = (function(superClass1) {
    extend1(Existence, superClass1);

    function Existence(expression) {
      this.expression = expression;
    }

    Existence.prototype.children = ['expression'];

    Existence.prototype.invert = NEGATE;

    Existence.prototype.compileNode = function(o) {
      var cmp, cnj, code, ref3;
      this.expression.front = this.front;
      code = this.expression.compile(o, LEVEL_OP);
      if (this.expression.unwrap() instanceof IdentifierLiteral && !o.scope.check(code)) {
        ref3 = this.negated ? ['===', '||'] : ['!==', '&&'], cmp = ref3[0], cnj = ref3[1];
        code = "typeof " + code + " " + cmp + " \"undefined\" " + cnj + " " + code + " " + cmp + " null";
      } else {
        code = code + " " + (this.negated ? '==' : '!=') + " null";
      }
      return [this.makeCode(o.level <= LEVEL_COND ? code : "(" + code + ")")];
    };

    return Existence;

  })(Base);

  exports.Parens = Parens = (function(superClass1) {
    extend1(Parens, superClass1);

    function Parens(body1) {
      this.body = body1;
    }

    Parens.prototype.children = ['body'];

    Parens.prototype.unwrap = function() {
      return this.body;
    };

    Parens.prototype.isComplex = function() {
      return this.body.isComplex();
    };

    Parens.prototype.compileNode = function(o) {
      var bare, expr, fragments;
      expr = this.body.unwrap();
      if (expr instanceof Value && expr.isAtomic()) {
        expr.front = this.front;
        return expr.compileToFragments(o);
      }
      fragments = expr.compileToFragments(o, LEVEL_PAREN);
      bare = o.level < LEVEL_OP && (expr instanceof Op || expr instanceof Call || (expr instanceof For && expr.returns));
      if (bare) {
        return fragments;
      } else {
        return this.wrapInBraces(fragments);
      }
    };

    return Parens;

  })(Base);

  exports.StringWithInterpolations = StringWithInterpolations = (function(superClass1) {
    extend1(StringWithInterpolations, superClass1);

    function StringWithInterpolations() {
      return StringWithInterpolations.__super__.constructor.apply(this, arguments);
    }

    StringWithInterpolations.prototype.compileNode = function(o) {
      var element, elements, expr, fragments, j, len1, value;
      if (!o.inTaggedTemplateCall) {
        return StringWithInterpolations.__super__.compileNode.apply(this, arguments);
      }
      expr = this.body.unwrap();
      elements = [];
      expr.traverseChildren(false, function(node) {
        if (node instanceof StringLiteral) {
          elements.push(node);
          return true;
        } else if (node instanceof Parens) {
          elements.push(node);
          return false;
        }
        return true;
      });
      fragments = [];
      fragments.push(this.makeCode('`'));
      for (j = 0, len1 = elements.length; j < len1; j++) {
        element = elements[j];
        if (element instanceof StringLiteral) {
          value = element.value.slice(1, -1);
          value = value.replace(/(\\*)(`|\$\{)/g, function(match, backslashes, toBeEscaped) {
            if (backslashes.length % 2 === 0) {
              return backslashes + "\\" + toBeEscaped;
            } else {
              return match;
            }
          });
          fragments.push(this.makeCode(value));
        } else {
          fragments.push(this.makeCode('${'));
          fragments.push.apply(fragments, element.compileToFragments(o, LEVEL_PAREN));
          fragments.push(this.makeCode('}'));
        }
      }
      fragments.push(this.makeCode('`'));
      return fragments;
    };

    return StringWithInterpolations;

  })(Parens);

  exports.For = For = (function(superClass1) {
    extend1(For, superClass1);

    function For(body, source) {
      var ref3;
      this.source = source.source, this.guard = source.guard, this.step = source.step, this.name = source.name, this.index = source.index;
      this.body = Block.wrap([body]);
      this.own = !!source.own;
      this.object = !!source.object;
      this.from = !!source.from;
      if (this.from && this.index) {
        this.index.error('cannot use index with for-from');
      }
      if (this.own && !this.object) {
        source.ownTag.error("cannot use own with for-" + (this.from ? 'from' : 'in'));
      }
      if (this.object) {
        ref3 = [this.index, this.name], this.name = ref3[0], this.index = ref3[1];
      }
      if (this.index instanceof Value) {
        this.index.error('index cannot be a pattern matching expression');
      }
      this.range = this.source instanceof Value && this.source.base instanceof Range && !this.source.properties.length && !this.from;
      this.pattern = this.name instanceof Value;
      if (this.range && this.index) {
        this.index.error('indexes do not apply to range loops');
      }
      if (this.range && this.pattern) {
        this.name.error('cannot pattern match over range loops');
      }
      this.returns = false;
    }

    For.prototype.children = ['body', 'source', 'guard', 'step'];

    For.prototype.compileNode = function(o) {
      var body, bodyFragments, compare, compareDown, declare, declareDown, defPart, defPartFragments, down, forPartFragments, guardPart, idt1, increment, index, ivar, kvar, kvarAssign, last, lvar, name, namePart, ref, ref3, ref4, resultPart, returnResult, rvar, scope, source, step, stepNum, stepVar, svar, varPart;
      body = Block.wrap([this.body]);
      ref3 = body.expressions, last = ref3[ref3.length - 1];
      if ((last != null ? last.jumps() : void 0) instanceof Return) {
        this.returns = false;
      }
      source = this.range ? this.source.base : this.source;
      scope = o.scope;
      if (!this.pattern) {
        name = this.name && (this.name.compile(o, LEVEL_LIST));
      }
      index = this.index && (this.index.compile(o, LEVEL_LIST));
      if (name && !this.pattern) {
        scope.find(name);
      }
      if (index) {
        scope.find(index);
      }
      if (this.returns) {
        rvar = scope.freeVariable('results');
      }
      if (this.from) {
        if (this.pattern) {
          ivar = scope.freeVariable('x', {
            single: true
          });
        }
      } else {
        ivar = (this.object && index) || scope.freeVariable('i', {
          single: true
        });
      }
      kvar = ((this.range || this.from) && name) || index || ivar;
      kvarAssign = kvar !== ivar ? kvar + " = " : "";
      if (this.step && !this.range) {
        ref4 = this.cacheToCodeFragments(this.step.cache(o, LEVEL_LIST, isComplexOrAssignable)), step = ref4[0], stepVar = ref4[1];
        if (this.step.isNumber()) {
          stepNum = Number(stepVar);
        }
      }
      if (this.pattern) {
        name = ivar;
      }
      varPart = '';
      guardPart = '';
      defPart = '';
      idt1 = this.tab + TAB;
      if (this.range) {
        forPartFragments = source.compileToFragments(merge(o, {
          index: ivar,
          name: name,
          step: this.step,
          isComplex: isComplexOrAssignable
        }));
      } else {
        svar = this.source.compile(o, LEVEL_LIST);
        if ((name || this.own) && !(this.source.unwrap() instanceof IdentifierLiteral)) {
          defPart += "" + this.tab + (ref = scope.freeVariable('ref')) + " = " + svar + ";\n";
          svar = ref;
        }
        if (name && !this.pattern && !this.from) {
          namePart = name + " = " + svar + "[" + kvar + "]";
        }
        if (!this.object && !this.from) {
          if (step !== stepVar) {
            defPart += "" + this.tab + step + ";\n";
          }
          down = stepNum < 0;
          if (!(this.step && (stepNum != null) && down)) {
            lvar = scope.freeVariable('len');
          }
          declare = "" + kvarAssign + ivar + " = 0, " + lvar + " = " + svar + ".length";
          declareDown = "" + kvarAssign + ivar + " = " + svar + ".length - 1";
          compare = ivar + " < " + lvar;
          compareDown = ivar + " >= 0";
          if (this.step) {
            if (stepNum != null) {
              if (down) {
                compare = compareDown;
                declare = declareDown;
              }
            } else {
              compare = stepVar + " > 0 ? " + compare + " : " + compareDown;
              declare = "(" + stepVar + " > 0 ? (" + declare + ") : " + declareDown + ")";
            }
            increment = ivar + " += " + stepVar;
          } else {
            increment = "" + (kvar !== ivar ? "++" + ivar : ivar + "++");
          }
          forPartFragments = [this.makeCode(declare + "; " + compare + "; " + kvarAssign + increment)];
        }
      }
      if (this.returns) {
        resultPart = "" + this.tab + rvar + " = [];\n";
        returnResult = "\n" + this.tab + "return " + rvar + ";";
        body.makeReturn(rvar);
      }
      if (this.guard) {
        if (body.expressions.length > 1) {
          body.expressions.unshift(new If((new Parens(this.guard)).invert(), new StatementLiteral("continue")));
        } else {
          if (this.guard) {
            body = Block.wrap([new If(this.guard, body)]);
          }
        }
      }
      if (this.pattern) {
        body.expressions.unshift(new Assign(this.name, this.from ? new IdentifierLiteral(kvar) : new Literal(svar + "[" + kvar + "]")));
      }
      defPartFragments = [].concat(this.makeCode(defPart), this.pluckDirectCall(o, body));
      if (namePart) {
        varPart = "\n" + idt1 + namePart + ";";
      }
      if (this.object) {
        forPartFragments = [this.makeCode(kvar + " in " + svar)];
        if (this.own) {
          guardPart = "\n" + idt1 + "if (!" + (utility('hasProp', o)) + ".call(" + svar + ", " + kvar + ")) continue;";
        }
      } else if (this.from) {
        forPartFragments = [this.makeCode(kvar + " of " + svar)];
      }
      bodyFragments = body.compileToFragments(merge(o, {
        indent: idt1
      }), LEVEL_TOP);
      if (bodyFragments && bodyFragments.length > 0) {
        bodyFragments = [].concat(this.makeCode("\n"), bodyFragments, this.makeCode("\n"));
      }
      return [].concat(defPartFragments, this.makeCode("" + (resultPart || '') + this.tab + "for ("), forPartFragments, this.makeCode(") {" + guardPart + varPart), bodyFragments, this.makeCode(this.tab + "}" + (returnResult || '')));
    };

    For.prototype.pluckDirectCall = function(o, body) {
      var base, defs, expr, fn, idx, j, len1, ref, ref3, ref4, ref5, ref6, ref7, ref8, ref9, val;
      defs = [];
      ref3 = body.expressions;
      for (idx = j = 0, len1 = ref3.length; j < len1; idx = ++j) {
        expr = ref3[idx];
        expr = expr.unwrapAll();
        if (!(expr instanceof Call)) {
          continue;
        }
        val = (ref4 = expr.variable) != null ? ref4.unwrapAll() : void 0;
        if (!((val instanceof Code) || (val instanceof Value && ((ref5 = val.base) != null ? ref5.unwrapAll() : void 0) instanceof Code && val.properties.length === 1 && ((ref6 = (ref7 = val.properties[0].name) != null ? ref7.value : void 0) === 'call' || ref6 === 'apply')))) {
          continue;
        }
        fn = ((ref8 = val.base) != null ? ref8.unwrapAll() : void 0) || val;
        ref = new IdentifierLiteral(o.scope.freeVariable('fn'));
        base = new Value(ref);
        if (val.base) {
          ref9 = [base, val], val.base = ref9[0], base = ref9[1];
        }
        body.expressions[idx] = new Call(base, expr.args);
        defs = defs.concat(this.makeCode(this.tab), new Assign(ref, fn).compileToFragments(o, LEVEL_TOP), this.makeCode(';\n'));
      }
      return defs;
    };

    return For;

  })(While);

  exports.Switch = Switch = (function(superClass1) {
    extend1(Switch, superClass1);

    function Switch(subject, cases, otherwise) {
      this.subject = subject;
      this.cases = cases;
      this.otherwise = otherwise;
    }

    Switch.prototype.children = ['subject', 'cases', 'otherwise'];

    Switch.prototype.isStatement = YES;

    Switch.prototype.jumps = function(o) {
      var block, conds, j, jumpNode, len1, ref3, ref4, ref5;
      if (o == null) {
        o = {
          block: true
        };
      }
      ref3 = this.cases;
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        ref4 = ref3[j], conds = ref4[0], block = ref4[1];
        if (jumpNode = block.jumps(o)) {
          return jumpNode;
        }
      }
      return (ref5 = this.otherwise) != null ? ref5.jumps(o) : void 0;
    };

    Switch.prototype.makeReturn = function(res) {
      var j, len1, pair, ref3, ref4;
      ref3 = this.cases;
      for (j = 0, len1 = ref3.length; j < len1; j++) {
        pair = ref3[j];
        pair[1].makeReturn(res);
      }
      if (res) {
        this.otherwise || (this.otherwise = new Block([new Literal('void 0')]));
      }
      if ((ref4 = this.otherwise) != null) {
        ref4.makeReturn(res);
      }
      return this;
    };

    Switch.prototype.compileNode = function(o) {
      var block, body, cond, conditions, expr, fragments, i, idt1, idt2, j, k, len1, len2, ref3, ref4, ref5;
      idt1 = o.indent + TAB;
      idt2 = o.indent = idt1 + TAB;
      fragments = [].concat(this.makeCode(this.tab + "switch ("), (this.subject ? this.subject.compileToFragments(o, LEVEL_PAREN) : this.makeCode("false")), this.makeCode(") {\n"));
      ref3 = this.cases;
      for (i = j = 0, len1 = ref3.length; j < len1; i = ++j) {
        ref4 = ref3[i], conditions = ref4[0], block = ref4[1];
        ref5 = flatten([conditions]);
        for (k = 0, len2 = ref5.length; k < len2; k++) {
          cond = ref5[k];
          if (!this.subject) {
            cond = cond.invert();
          }
          fragments = fragments.concat(this.makeCode(idt1 + "case "), cond.compileToFragments(o, LEVEL_PAREN), this.makeCode(":\n"));
        }
        if ((body = block.compileToFragments(o, LEVEL_TOP)).length > 0) {
          fragments = fragments.concat(body, this.makeCode('\n'));
        }
        if (i === this.cases.length - 1 && !this.otherwise) {
          break;
        }
        expr = this.lastNonComment(block.expressions);
        if (expr instanceof Return || (expr instanceof Literal && expr.jumps() && expr.value !== 'debugger')) {
          continue;
        }
        fragments.push(cond.makeCode(idt2 + 'break;\n'));
      }
      if (this.otherwise && this.otherwise.expressions.length) {
        fragments.push.apply(fragments, [this.makeCode(idt1 + "default:\n")].concat(slice.call(this.otherwise.compileToFragments(o, LEVEL_TOP)), [this.makeCode("\n")]));
      }
      fragments.push(this.makeCode(this.tab + '}'));
      return fragments;
    };

    return Switch;

  })(Base);

  exports.If = If = (function(superClass1) {
    extend1(If, superClass1);

    function If(condition, body1, options) {
      this.body = body1;
      if (options == null) {
        options = {};
      }
      this.condition = options.type === 'unless' ? condition.invert() : condition;
      this.elseBody = null;
      this.isChain = false;
      this.soak = options.soak;
    }

    If.prototype.children = ['condition', 'body', 'elseBody'];

    If.prototype.bodyNode = function() {
      var ref3;
      return (ref3 = this.body) != null ? ref3.unwrap() : void 0;
    };

    If.prototype.elseBodyNode = function() {
      var ref3;
      return (ref3 = this.elseBody) != null ? ref3.unwrap() : void 0;
    };

    If.prototype.addElse = function(elseBody) {
      if (this.isChain) {
        this.elseBodyNode().addElse(elseBody);
      } else {
        this.isChain = elseBody instanceof If;
        this.elseBody = this.ensureBlock(elseBody);
        this.elseBody.updateLocationDataIfMissing(elseBody.locationData);
      }
      return this;
    };

    If.prototype.isStatement = function(o) {
      var ref3;
      return (o != null ? o.level : void 0) === LEVEL_TOP || this.bodyNode().isStatement(o) || ((ref3 = this.elseBodyNode()) != null ? ref3.isStatement(o) : void 0);
    };

    If.prototype.jumps = function(o) {
      var ref3;
      return this.body.jumps(o) || ((ref3 = this.elseBody) != null ? ref3.jumps(o) : void 0);
    };

    If.prototype.compileNode = function(o) {
      if (this.isStatement(o)) {
        return this.compileStatement(o);
      } else {
        return this.compileExpression(o);
      }
    };

    If.prototype.makeReturn = function(res) {
      if (res) {
        this.elseBody || (this.elseBody = new Block([new Literal('void 0')]));
      }
      this.body && (this.body = new Block([this.body.makeReturn(res)]));
      this.elseBody && (this.elseBody = new Block([this.elseBody.makeReturn(res)]));
      return this;
    };

    If.prototype.ensureBlock = function(node) {
      if (node instanceof Block) {
        return node;
      } else {
        return new Block([node]);
      }
    };

    If.prototype.compileStatement = function(o) {
      var answer, body, child, cond, exeq, ifPart, indent;
      child = del(o, 'chainChild');
      exeq = del(o, 'isExistentialEquals');
      if (exeq) {
        return new If(this.condition.invert(), this.elseBodyNode(), {
          type: 'if'
        }).compileToFragments(o);
      }
      indent = o.indent + TAB;
      cond = this.condition.compileToFragments(o, LEVEL_PAREN);
      body = this.ensureBlock(this.body).compileToFragments(merge(o, {
        indent: indent
      }));
      ifPart = [].concat(this.makeCode("if ("), cond, this.makeCode(") {\n"), body, this.makeCode("\n" + this.tab + "}"));
      if (!child) {
        ifPart.unshift(this.makeCode(this.tab));
      }
      if (!this.elseBody) {
        return ifPart;
      }
      answer = ifPart.concat(this.makeCode(' else '));
      if (this.isChain) {
        o.chainChild = true;
        answer = answer.concat(this.elseBody.unwrap().compileToFragments(o, LEVEL_TOP));
      } else {
        answer = answer.concat(this.makeCode("{\n"), this.elseBody.compileToFragments(merge(o, {
          indent: indent
        }), LEVEL_TOP), this.makeCode("\n" + this.tab + "}"));
      }
      return answer;
    };

    If.prototype.compileExpression = function(o) {
      var alt, body, cond, fragments;
      cond = this.condition.compileToFragments(o, LEVEL_COND);
      body = this.bodyNode().compileToFragments(o, LEVEL_LIST);
      alt = this.elseBodyNode() ? this.elseBodyNode().compileToFragments(o, LEVEL_LIST) : [this.makeCode('void 0')];
      fragments = cond.concat(this.makeCode(" ? "), body, this.makeCode(" : "), alt);
      if (o.level >= LEVEL_COND) {
        return this.wrapInBraces(fragments);
      } else {
        return fragments;
      }
    };

    If.prototype.unfoldSoak = function() {
      return this.soak && this;
    };

    return If;

  })(Base);

  UTILITIES = {
    extend: function(o) {
      return "function(child, parent) { for (var key in parent) { if (" + (utility('hasProp', o)) + ".call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; }";
    },
    bind: function() {
      return 'function(fn, me){ return function(){ return fn.apply(me, arguments); }; }';
    },
    indexOf: function() {
      return "[].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; }";
    },
    modulo: function() {
      return "function(a, b) { return (+a % (b = +b) + b) % b; }";
    },
    hasProp: function() {
      return '{}.hasOwnProperty';
    },
    slice: function() {
      return '[].slice';
    }
  };

  LEVEL_TOP = 1;

  LEVEL_PAREN = 2;

  LEVEL_LIST = 3;

  LEVEL_COND = 4;

  LEVEL_OP = 5;

  LEVEL_ACCESS = 6;

  TAB = '  ';

  SIMPLENUM = /^[+-]?\d+$/;

  utility = function(name, o) {
    var ref, root;
    root = o.scope.root;
    if (name in root.utilities) {
      return root.utilities[name];
    } else {
      ref = root.freeVariable(name);
      root.assign(ref, UTILITIES[name](o));
      return root.utilities[name] = ref;
    }
  };

  multident = function(code, tab) {
    code = code.replace(/\n/g, '$&' + tab);
    return code.replace(/\s+$/, '');
  };

  isLiteralArguments = function(node) {
    return node instanceof IdentifierLiteral && node.value === 'arguments';
  };

  isLiteralThis = function(node) {
    return node instanceof ThisLiteral || (node instanceof Code && node.bound) || node instanceof SuperCall;
  };

  isComplexOrAssignable = function(node) {
    return node.isComplex() || (typeof node.isAssignable === "function" ? node.isAssignable() : void 0);
  };

  unfoldSoak = function(o, parent, name) {
    var ifn;
    if (!(ifn = parent[name].unfoldSoak(o))) {
      return;
    }
    parent[name] = ifn.body;
    ifn.body = new Value(parent);
    return ifn;
  };

}).call(this);

},{"./helpers":16,"./lexer":17,"./scope":22}],19:[function(require,module,exports){
(function (process){
/* parser generated by jison 0.4.17 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var parser = (function(){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,22],$V1=[1,25],$V2=[1,83],$V3=[1,79],$V4=[1,84],$V5=[1,85],$V6=[1,81],$V7=[1,82],$V8=[1,56],$V9=[1,58],$Va=[1,59],$Vb=[1,60],$Vc=[1,61],$Vd=[1,62],$Ve=[1,49],$Vf=[1,50],$Vg=[1,32],$Vh=[1,68],$Vi=[1,69],$Vj=[1,78],$Vk=[1,47],$Vl=[1,51],$Vm=[1,52],$Vn=[1,67],$Vo=[1,65],$Vp=[1,66],$Vq=[1,64],$Vr=[1,42],$Vs=[1,48],$Vt=[1,63],$Vu=[1,73],$Vv=[1,74],$Vw=[1,75],$Vx=[1,76],$Vy=[1,46],$Vz=[1,72],$VA=[1,34],$VB=[1,35],$VC=[1,36],$VD=[1,37],$VE=[1,38],$VF=[1,39],$VG=[1,86],$VH=[1,6,32,42,131],$VI=[1,101],$VJ=[1,89],$VK=[1,88],$VL=[1,87],$VM=[1,90],$VN=[1,91],$VO=[1,92],$VP=[1,93],$VQ=[1,94],$VR=[1,95],$VS=[1,96],$VT=[1,97],$VU=[1,98],$VV=[1,99],$VW=[1,100],$VX=[1,104],$VY=[1,6,31,32,42,65,70,73,89,94,115,120,122,131,133,134,135,139,140,156,159,160,163,164,165,166,167,168,169,170,171,172,173,174],$VZ=[2,165],$V_=[1,110],$V$=[1,111],$V01=[1,112],$V11=[1,113],$V21=[1,115],$V31=[1,116],$V41=[1,109],$V51=[1,6,32,42,131,133,135,139,156],$V61=[2,27],$V71=[1,123],$V81=[1,121],$V91=[1,6,31,32,40,41,42,65,70,73,82,83,84,85,87,89,90,94,113,114,115,120,122,131,133,134,135,139,140,156,159,160,163,164,165,166,167,168,169,170,171,172,173,174],$Va1=[2,94],$Vb1=[1,6,31,32,42,46,65,70,73,82,83,84,85,87,89,90,94,113,114,115,120,122,131,133,134,135,139,140,156,159,160,163,164,165,166,167,168,169,170,171,172,173,174],$Vc1=[2,73],$Vd1=[1,128],$Ve1=[1,133],$Vf1=[1,134],$Vg1=[1,136],$Vh1=[1,6,31,32,40,41,42,55,65,70,73,82,83,84,85,87,89,90,94,113,114,115,120,122,131,133,134,135,139,140,156,159,160,163,164,165,166,167,168,169,170,171,172,173,174],$Vi1=[2,91],$Vj1=[1,6,32,42,65,70,73,89,94,115,120,122,131,133,134,135,139,140,156,159,160,163,164,165,166,167,168,169,170,171,172,173,174],$Vk1=[2,63],$Vl1=[1,166],$Vm1=[1,178],$Vn1=[1,180],$Vo1=[1,175],$Vp1=[1,182],$Vq1=[1,184],$Vr1=[1,6,31,32,40,41,42,55,65,70,73,82,83,84,85,87,89,90,94,96,113,114,115,120,122,131,133,134,135,139,140,156,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],$Vs1=[2,110],$Vt1=[1,6,31,32,40,41,42,58,65,70,73,82,83,84,85,87,89,90,94,113,114,115,120,122,131,133,134,135,139,140,156,159,160,163,164,165,166,167,168,169,170,171,172,173,174],$Vu1=[1,6,31,32,40,41,42,46,58,65,70,73,82,83,84,85,87,89,90,94,113,114,115,120,122,131,133,134,135,139,140,156,159,160,163,164,165,166,167,168,169,170,171,172,173,174],$Vv1=[40,41,114],$Vw1=[1,241],$Vx1=[1,240],$Vy1=[1,6,31,32,42,65,70,73,89,94,115,120,122,131,133,134,135,139,140,156],$Vz1=[2,71],$VA1=[1,250],$VB1=[6,31,32,65,70],$VC1=[6,31,32,55,65,70,73],$VD1=[1,6,31,32,42,65,70,73,89,94,115,120,122,131,133,134,135,139,140,156,159,160,164,166,167,168,169,170,171,172,173,174],$VE1=[40,41,82,83,84,85,87,90,113,114],$VF1=[1,269],$VG1=[2,62],$VH1=[1,279],$VI1=[1,281],$VJ1=[1,286],$VK1=[1,288],$VL1=[2,186],$VM1=[1,6,31,32,40,41,42,55,65,70,73,82,83,84,85,87,89,90,94,113,114,115,120,122,131,133,134,135,139,140,146,147,148,156,159,160,163,164,165,166,167,168,169,170,171,172,173,174],$VN1=[1,297],$VO1=[6,31,32,70,115,120],$VP1=[1,6,31,32,40,41,42,55,58,65,70,73,82,83,84,85,87,89,90,94,96,113,114,115,120,122,131,133,134,135,139,140,146,147,148,156,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],$VQ1=[1,6,31,32,42,65,70,73,89,94,115,120,122,131,140,156],$VR1=[1,6,31,32,42,65,70,73,89,94,115,120,122,131,134,140,156],$VS1=[146,147,148],$VT1=[70,146,147,148],$VU1=[6,31,94],$VV1=[1,311],$VW1=[6,31,32,70,94],$VX1=[6,31,32,58,70,94],$VY1=[6,31,32,55,58,70,94],$VZ1=[1,6,31,32,42,65,70,73,89,94,115,120,122,131,133,134,135,139,140,156,159,160,166,167,168,169,170,171,172,173,174],$V_1=[12,28,34,38,40,41,44,45,48,49,50,51,52,53,61,62,63,67,68,89,92,95,97,105,112,117,118,119,125,129,130,133,135,137,139,149,155,157,158,159,160,161,162],$V$1=[2,175],$V02=[6,31,32],$V12=[2,72],$V22=[1,323],$V32=[1,324],$V42=[1,6,31,32,42,65,70,73,89,94,115,120,122,127,128,131,133,134,135,139,140,151,153,156,159,160,163,164,165,166,167,168,169,170,171,172,173,174],$V52=[32,151,153],$V62=[1,6,32,42,65,70,73,89,94,115,120,122,131,134,140,156],$V72=[1,350],$V82=[1,356],$V92=[1,6,32,42,131,156],$Va2=[2,86],$Vb2=[1,366],$Vc2=[1,367],$Vd2=[1,6,31,32,42,65,70,73,89,94,115,120,122,131,133,134,135,139,140,151,156,159,160,163,164,165,166,167,168,169,170,171,172,173,174],$Ve2=[1,6,31,32,42,65,70,73,89,94,115,120,122,131,133,135,139,140,156],$Vf2=[1,380],$Vg2=[1,381],$Vh2=[6,31,32,94],$Vi2=[6,31,32,70],$Vj2=[1,6,31,32,42,65,70,73,89,94,115,120,122,127,131,133,134,135,139,140,156,159,160,163,164,165,166,167,168,169,170,171,172,173,174],$Vk2=[31,70],$Vl2=[1,407],$Vm2=[1,408],$Vn2=[1,414],$Vo2=[1,415];
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"Root":3,"Body":4,"Line":5,"TERMINATOR":6,"Expression":7,"Statement":8,"YieldReturn":9,"Return":10,"Comment":11,"STATEMENT":12,"Import":13,"Export":14,"Value":15,"Invocation":16,"Code":17,"Operation":18,"Assign":19,"If":20,"Try":21,"While":22,"For":23,"Switch":24,"Class":25,"Throw":26,"Yield":27,"YIELD":28,"FROM":29,"Block":30,"INDENT":31,"OUTDENT":32,"Identifier":33,"IDENTIFIER":34,"Property":35,"PROPERTY":36,"AlphaNumeric":37,"NUMBER":38,"String":39,"STRING":40,"STRING_START":41,"STRING_END":42,"Regex":43,"REGEX":44,"REGEX_START":45,"REGEX_END":46,"Literal":47,"JS":48,"UNDEFINED":49,"NULL":50,"BOOL":51,"INFINITY":52,"NAN":53,"Assignable":54,"=":55,"AssignObj":56,"ObjAssignable":57,":":58,"SimpleObjAssignable":59,"ThisProperty":60,"RETURN":61,"HERECOMMENT":62,"PARAM_START":63,"ParamList":64,"PARAM_END":65,"FuncGlyph":66,"->":67,"=>":68,"OptComma":69,",":70,"Param":71,"ParamVar":72,"...":73,"Array":74,"Object":75,"Splat":76,"SimpleAssignable":77,"Accessor":78,"Parenthetical":79,"Range":80,"This":81,".":82,"?.":83,"::":84,"?::":85,"Index":86,"INDEX_START":87,"IndexValue":88,"INDEX_END":89,"INDEX_SOAK":90,"Slice":91,"{":92,"AssignList":93,"}":94,"CLASS":95,"EXTENDS":96,"IMPORT":97,"ImportDefaultSpecifier":98,"ImportNamespaceSpecifier":99,"ImportSpecifierList":100,"ImportSpecifier":101,"AS":102,"DEFAULT":103,"IMPORT_ALL":104,"EXPORT":105,"ExportSpecifierList":106,"EXPORT_ALL":107,"ExportSpecifier":108,"OptFuncExist":109,"Arguments":110,"Super":111,"SUPER":112,"FUNC_EXIST":113,"CALL_START":114,"CALL_END":115,"ArgList":116,"THIS":117,"@":118,"[":119,"]":120,"RangeDots":121,"..":122,"Arg":123,"SimpleArgs":124,"TRY":125,"Catch":126,"FINALLY":127,"CATCH":128,"THROW":129,"(":130,")":131,"WhileSource":132,"WHILE":133,"WHEN":134,"UNTIL":135,"Loop":136,"LOOP":137,"ForBody":138,"FOR":139,"BY":140,"ForStart":141,"ForSource":142,"ForVariables":143,"OWN":144,"ForValue":145,"FORIN":146,"FOROF":147,"FORFROM":148,"SWITCH":149,"Whens":150,"ELSE":151,"When":152,"LEADING_WHEN":153,"IfBlock":154,"IF":155,"POST_IF":156,"UNARY":157,"UNARY_MATH":158,"-":159,"+":160,"--":161,"++":162,"?":163,"MATH":164,"**":165,"SHIFT":166,"COMPARE":167,"&":168,"^":169,"|":170,"&&":171,"||":172,"BIN?":173,"RELATION":174,"COMPOUND_ASSIGN":175,"$accept":0,"$end":1},
terminals_: {2:"error",6:"TERMINATOR",12:"STATEMENT",28:"YIELD",29:"FROM",31:"INDENT",32:"OUTDENT",34:"IDENTIFIER",36:"PROPERTY",38:"NUMBER",40:"STRING",41:"STRING_START",42:"STRING_END",44:"REGEX",45:"REGEX_START",46:"REGEX_END",48:"JS",49:"UNDEFINED",50:"NULL",51:"BOOL",52:"INFINITY",53:"NAN",55:"=",58:":",61:"RETURN",62:"HERECOMMENT",63:"PARAM_START",65:"PARAM_END",67:"->",68:"=>",70:",",73:"...",82:".",83:"?.",84:"::",85:"?::",87:"INDEX_START",89:"INDEX_END",90:"INDEX_SOAK",92:"{",94:"}",95:"CLASS",96:"EXTENDS",97:"IMPORT",102:"AS",103:"DEFAULT",104:"IMPORT_ALL",105:"EXPORT",107:"EXPORT_ALL",112:"SUPER",113:"FUNC_EXIST",114:"CALL_START",115:"CALL_END",117:"THIS",118:"@",119:"[",120:"]",122:"..",125:"TRY",127:"FINALLY",128:"CATCH",129:"THROW",130:"(",131:")",133:"WHILE",134:"WHEN",135:"UNTIL",137:"LOOP",139:"FOR",140:"BY",144:"OWN",146:"FORIN",147:"FOROF",148:"FORFROM",149:"SWITCH",151:"ELSE",153:"LEADING_WHEN",155:"IF",156:"POST_IF",157:"UNARY",158:"UNARY_MATH",159:"-",160:"+",161:"--",162:"++",163:"?",164:"MATH",165:"**",166:"SHIFT",167:"COMPARE",168:"&",169:"^",170:"|",171:"&&",172:"||",173:"BIN?",174:"RELATION",175:"COMPOUND_ASSIGN"},
productions_: [0,[3,0],[3,1],[4,1],[4,3],[4,2],[5,1],[5,1],[5,1],[8,1],[8,1],[8,1],[8,1],[8,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[27,1],[27,2],[27,3],[30,2],[30,3],[33,1],[35,1],[37,1],[37,1],[39,1],[39,3],[43,1],[43,3],[47,1],[47,1],[47,1],[47,1],[47,1],[47,1],[47,1],[47,1],[19,3],[19,4],[19,5],[56,1],[56,3],[56,5],[56,3],[56,5],[56,1],[59,1],[59,1],[59,1],[57,1],[57,1],[10,2],[10,1],[9,3],[9,2],[11,1],[17,5],[17,2],[66,1],[66,1],[69,0],[69,1],[64,0],[64,1],[64,3],[64,4],[64,6],[71,1],[71,2],[71,3],[71,1],[72,1],[72,1],[72,1],[72,1],[76,2],[77,1],[77,2],[77,2],[77,1],[54,1],[54,1],[54,1],[15,1],[15,1],[15,1],[15,1],[15,1],[78,2],[78,2],[78,2],[78,2],[78,1],[78,1],[86,3],[86,2],[88,1],[88,1],[75,4],[93,0],[93,1],[93,3],[93,4],[93,6],[25,1],[25,2],[25,3],[25,4],[25,2],[25,3],[25,4],[25,5],[13,2],[13,4],[13,4],[13,5],[13,7],[13,6],[13,9],[100,1],[100,3],[100,4],[100,4],[100,6],[101,1],[101,3],[101,1],[101,3],[98,1],[99,3],[14,3],[14,5],[14,2],[14,4],[14,5],[14,6],[14,3],[14,4],[14,7],[106,1],[106,3],[106,4],[106,4],[106,6],[108,1],[108,3],[108,3],[108,1],[16,3],[16,3],[16,3],[16,1],[111,1],[111,2],[109,0],[109,1],[110,2],[110,4],[81,1],[81,1],[60,2],[74,2],[74,4],[121,1],[121,1],[80,5],[91,3],[91,2],[91,2],[91,1],[116,1],[116,3],[116,4],[116,4],[116,6],[123,1],[123,1],[123,1],[124,1],[124,3],[21,2],[21,3],[21,4],[21,5],[126,3],[126,3],[126,2],[26,2],[79,3],[79,5],[132,2],[132,4],[132,2],[132,4],[22,2],[22,2],[22,2],[22,1],[136,2],[136,2],[23,2],[23,2],[23,2],[138,2],[138,4],[138,2],[141,2],[141,3],[145,1],[145,1],[145,1],[145,1],[143,1],[143,3],[142,2],[142,2],[142,4],[142,4],[142,4],[142,6],[142,6],[142,2],[142,4],[24,5],[24,7],[24,4],[24,6],[150,1],[150,2],[152,3],[152,4],[154,3],[154,5],[20,1],[20,3],[20,3],[20,3],[18,2],[18,2],[18,2],[18,2],[18,2],[18,2],[18,2],[18,2],[18,2],[18,3],[18,3],[18,3],[18,3],[18,3],[18,3],[18,3],[18,3],[18,3],[18,3],[18,3],[18,3],[18,3],[18,3],[18,5],[18,4],[18,3]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:
return this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Block);
break;
case 2:
return this.$ = $$[$0];
break;
case 3:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(yy.Block.wrap([$$[$0]]));
break;
case 4:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])($$[$0-2].push($$[$0]));
break;
case 5:
this.$ = $$[$0-1];
break;
case 6: case 7: case 8: case 9: case 10: case 12: case 13: case 14: case 15: case 16: case 17: case 18: case 19: case 20: case 21: case 22: case 23: case 24: case 25: case 26: case 35: case 40: case 42: case 56: case 57: case 58: case 59: case 60: case 61: case 71: case 72: case 82: case 83: case 84: case 85: case 90: case 91: case 94: case 98: case 104: case 162: case 186: case 187: case 189: case 219: case 220: case 238: case 244:
this.$ = $$[$0];
break;
case 11:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.StatementLiteral($$[$0]));
break;
case 27:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Op($$[$0], new yy.Value(new yy.Literal(''))));
break;
case 28: case 248: case 249:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Op($$[$0-1], $$[$0]));
break;
case 29:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Op($$[$0-2].concat($$[$0-1]), $$[$0]));
break;
case 30:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Block);
break;
case 31: case 105:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])($$[$0-1]);
break;
case 32:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.IdentifierLiteral($$[$0]));
break;
case 33:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.PropertyName($$[$0]));
break;
case 34:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.NumberLiteral($$[$0]));
break;
case 36:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.StringLiteral($$[$0]));
break;
case 37:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.StringWithInterpolations($$[$0-1]));
break;
case 38:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.RegexLiteral($$[$0]));
break;
case 39:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.RegexWithInterpolations($$[$0-1].args));
break;
case 41:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.PassthroughLiteral($$[$0]));
break;
case 43:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.UndefinedLiteral);
break;
case 44:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.NullLiteral);
break;
case 45:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.BooleanLiteral($$[$0]));
break;
case 46:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.InfinityLiteral($$[$0]));
break;
case 47:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.NaNLiteral);
break;
case 48:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Assign($$[$0-2], $$[$0]));
break;
case 49:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.Assign($$[$0-3], $$[$0]));
break;
case 50:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.Assign($$[$0-4], $$[$0-1]));
break;
case 51: case 87: case 92: case 93: case 95: case 96: case 97: case 221: case 222:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Value($$[$0]));
break;
case 52:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Assign(yy.addLocationDataFn(_$[$0-2])(new yy.Value($$[$0-2])), $$[$0], 'object', {
          operatorToken: yy.addLocationDataFn(_$[$0-1])(new yy.Literal($$[$0-1]))
        }));
break;
case 53:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.Assign(yy.addLocationDataFn(_$[$0-4])(new yy.Value($$[$0-4])), $$[$0-1], 'object', {
          operatorToken: yy.addLocationDataFn(_$[$0-3])(new yy.Literal($$[$0-3]))
        }));
break;
case 54:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Assign(yy.addLocationDataFn(_$[$0-2])(new yy.Value($$[$0-2])), $$[$0], null, {
          operatorToken: yy.addLocationDataFn(_$[$0-1])(new yy.Literal($$[$0-1]))
        }));
break;
case 55:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.Assign(yy.addLocationDataFn(_$[$0-4])(new yy.Value($$[$0-4])), $$[$0-1], null, {
          operatorToken: yy.addLocationDataFn(_$[$0-3])(new yy.Literal($$[$0-3]))
        }));
break;
case 62:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Return($$[$0]));
break;
case 63:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Return);
break;
case 64:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.YieldReturn($$[$0]));
break;
case 65:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.YieldReturn);
break;
case 66:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Comment($$[$0]));
break;
case 67:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.Code($$[$0-3], $$[$0], $$[$0-1]));
break;
case 68:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Code([], $$[$0], $$[$0-1]));
break;
case 69:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])('func');
break;
case 70:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])('boundfunc');
break;
case 73: case 110:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])([]);
break;
case 74: case 111: case 130: case 150: case 181: case 223:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])([$$[$0]]);
break;
case 75: case 112: case 131: case 151: case 182:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])($$[$0-2].concat($$[$0]));
break;
case 76: case 113: case 132: case 152: case 183:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])($$[$0-3].concat($$[$0]));
break;
case 77: case 114: case 134: case 154: case 185:
this.$ = yy.addLocationDataFn(_$[$0-5], _$[$0])($$[$0-5].concat($$[$0-2]));
break;
case 78:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Param($$[$0]));
break;
case 79:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Param($$[$0-1], null, true));
break;
case 80:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Param($$[$0-2], $$[$0]));
break;
case 81: case 188:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Expansion);
break;
case 86:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Splat($$[$0-1]));
break;
case 88:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])($$[$0-1].add($$[$0]));
break;
case 89:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Value($$[$0-1], [].concat($$[$0])));
break;
case 99:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Access($$[$0]));
break;
case 100:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Access($$[$0], 'soak'));
break;
case 101:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])([yy.addLocationDataFn(_$[$0-1])(new yy.Access(new yy.PropertyName('prototype'))), yy.addLocationDataFn(_$[$0])(new yy.Access($$[$0]))]);
break;
case 102:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])([yy.addLocationDataFn(_$[$0-1])(new yy.Access(new yy.PropertyName('prototype'), 'soak')), yy.addLocationDataFn(_$[$0])(new yy.Access($$[$0]))]);
break;
case 103:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Access(new yy.PropertyName('prototype')));
break;
case 106:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(yy.extend($$[$0], {
          soak: true
        }));
break;
case 107:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Index($$[$0]));
break;
case 108:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Slice($$[$0]));
break;
case 109:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.Obj($$[$0-2], $$[$0-3].generated));
break;
case 115:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Class);
break;
case 116:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Class(null, null, $$[$0]));
break;
case 117:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Class(null, $$[$0]));
break;
case 118:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.Class(null, $$[$0-1], $$[$0]));
break;
case 119:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Class($$[$0]));
break;
case 120:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Class($$[$0-1], null, $$[$0]));
break;
case 121:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.Class($$[$0-2], $$[$0]));
break;
case 122:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.Class($$[$0-3], $$[$0-1], $$[$0]));
break;
case 123:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.ImportDeclaration(null, $$[$0]));
break;
case 124:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.ImportDeclaration(new yy.ImportClause($$[$0-2], null), $$[$0]));
break;
case 125:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.ImportDeclaration(new yy.ImportClause(null, $$[$0-2]), $$[$0]));
break;
case 126:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.ImportDeclaration(new yy.ImportClause(null, new yy.ImportSpecifierList([])), $$[$0]));
break;
case 127:
this.$ = yy.addLocationDataFn(_$[$0-6], _$[$0])(new yy.ImportDeclaration(new yy.ImportClause(null, new yy.ImportSpecifierList($$[$0-4])), $$[$0]));
break;
case 128:
this.$ = yy.addLocationDataFn(_$[$0-5], _$[$0])(new yy.ImportDeclaration(new yy.ImportClause($$[$0-4], $$[$0-2]), $$[$0]));
break;
case 129:
this.$ = yy.addLocationDataFn(_$[$0-8], _$[$0])(new yy.ImportDeclaration(new yy.ImportClause($$[$0-7], new yy.ImportSpecifierList($$[$0-4])), $$[$0]));
break;
case 133: case 153: case 168: case 184:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])($$[$0-2]);
break;
case 135:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.ImportSpecifier($$[$0]));
break;
case 136:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.ImportSpecifier($$[$0-2], $$[$0]));
break;
case 137:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.ImportSpecifier(new yy.Literal($$[$0])));
break;
case 138:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.ImportSpecifier(new yy.Literal($$[$0-2]), $$[$0]));
break;
case 139:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.ImportDefaultSpecifier($$[$0]));
break;
case 140:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.ImportNamespaceSpecifier(new yy.Literal($$[$0-2]), $$[$0]));
break;
case 141:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.ExportNamedDeclaration(new yy.ExportSpecifierList([])));
break;
case 142:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.ExportNamedDeclaration(new yy.ExportSpecifierList($$[$0-2])));
break;
case 143:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.ExportNamedDeclaration($$[$0]));
break;
case 144:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.ExportNamedDeclaration(new yy.Assign($$[$0-2], $$[$0], null, {
          moduleDeclaration: 'export'
        })));
break;
case 145:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.ExportNamedDeclaration(new yy.Assign($$[$0-3], $$[$0], null, {
          moduleDeclaration: 'export'
        })));
break;
case 146:
this.$ = yy.addLocationDataFn(_$[$0-5], _$[$0])(new yy.ExportNamedDeclaration(new yy.Assign($$[$0-4], $$[$0-1], null, {
          moduleDeclaration: 'export'
        })));
break;
case 147:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.ExportDefaultDeclaration($$[$0]));
break;
case 148:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.ExportAllDeclaration(new yy.Literal($$[$0-2]), $$[$0]));
break;
case 149:
this.$ = yy.addLocationDataFn(_$[$0-6], _$[$0])(new yy.ExportNamedDeclaration(new yy.ExportSpecifierList($$[$0-4]), $$[$0]));
break;
case 155:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.ExportSpecifier($$[$0]));
break;
case 156:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.ExportSpecifier($$[$0-2], $$[$0]));
break;
case 157:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.ExportSpecifier($$[$0-2], new yy.Literal($$[$0])));
break;
case 158:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.ExportSpecifier(new yy.Literal($$[$0])));
break;
case 159:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.TaggedTemplateCall($$[$0-2], $$[$0], $$[$0-1]));
break;
case 160: case 161:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Call($$[$0-2], $$[$0], $$[$0-1]));
break;
case 163:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.SuperCall);
break;
case 164:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.SuperCall($$[$0]));
break;
case 165:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(false);
break;
case 166:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(true);
break;
case 167:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])([]);
break;
case 169: case 170:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Value(new yy.ThisLiteral));
break;
case 171:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Value(yy.addLocationDataFn(_$[$0-1])(new yy.ThisLiteral), [yy.addLocationDataFn(_$[$0])(new yy.Access($$[$0]))], 'this'));
break;
case 172:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Arr([]));
break;
case 173:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.Arr($$[$0-2]));
break;
case 174:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])('inclusive');
break;
case 175:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])('exclusive');
break;
case 176:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.Range($$[$0-3], $$[$0-1], $$[$0-2]));
break;
case 177:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Range($$[$0-2], $$[$0], $$[$0-1]));
break;
case 178:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Range($$[$0-1], null, $$[$0]));
break;
case 179:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Range(null, $$[$0], $$[$0-1]));
break;
case 180:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])(new yy.Range(null, null, $$[$0]));
break;
case 190:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])([].concat($$[$0-2], $$[$0]));
break;
case 191:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Try($$[$0]));
break;
case 192:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Try($$[$0-1], $$[$0][0], $$[$0][1]));
break;
case 193:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.Try($$[$0-2], null, null, $$[$0]));
break;
case 194:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.Try($$[$0-3], $$[$0-2][0], $$[$0-2][1], $$[$0]));
break;
case 195:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])([$$[$0-1], $$[$0]]);
break;
case 196:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])([yy.addLocationDataFn(_$[$0-1])(new yy.Value($$[$0-1])), $$[$0]]);
break;
case 197:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])([null, $$[$0]]);
break;
case 198:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Throw($$[$0]));
break;
case 199:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Parens($$[$0-1]));
break;
case 200:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.Parens($$[$0-2]));
break;
case 201:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.While($$[$0]));
break;
case 202:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.While($$[$0-2], {
          guard: $$[$0]
        }));
break;
case 203:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.While($$[$0], {
          invert: true
        }));
break;
case 204:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.While($$[$0-2], {
          invert: true,
          guard: $$[$0]
        }));
break;
case 205:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])($$[$0-1].addBody($$[$0]));
break;
case 206: case 207:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])($$[$0].addBody(yy.addLocationDataFn(_$[$0-1])(yy.Block.wrap([$$[$0-1]]))));
break;
case 208:
this.$ = yy.addLocationDataFn(_$[$0], _$[$0])($$[$0]);
break;
case 209:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.While(yy.addLocationDataFn(_$[$0-1])(new yy.BooleanLiteral('true'))).addBody($$[$0]));
break;
case 210:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.While(yy.addLocationDataFn(_$[$0-1])(new yy.BooleanLiteral('true'))).addBody(yy.addLocationDataFn(_$[$0])(yy.Block.wrap([$$[$0]]))));
break;
case 211: case 212:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.For($$[$0-1], $$[$0]));
break;
case 213:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.For($$[$0], $$[$0-1]));
break;
case 214:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])({
          source: yy.addLocationDataFn(_$[$0])(new yy.Value($$[$0]))
        });
break;
case 215:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])({
          source: yy.addLocationDataFn(_$[$0-2])(new yy.Value($$[$0-2])),
          step: $$[$0]
        });
break;
case 216:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])((function () {
        $$[$0].own = $$[$0-1].own;
        $$[$0].ownTag = $$[$0-1].ownTag;
        $$[$0].name = $$[$0-1][0];
        $$[$0].index = $$[$0-1][1];
        return $$[$0];
      }()));
break;
case 217:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])($$[$0]);
break;
case 218:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])((function () {
        $$[$0].own = true;
        $$[$0].ownTag = yy.addLocationDataFn(_$[$0-1])(new yy.Literal($$[$0-1]));
        return $$[$0];
      }()));
break;
case 224:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])([$$[$0-2], $$[$0]]);
break;
case 225:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])({
          source: $$[$0]
        });
break;
case 226:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])({
          source: $$[$0],
          object: true
        });
break;
case 227:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])({
          source: $$[$0-2],
          guard: $$[$0]
        });
break;
case 228:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])({
          source: $$[$0-2],
          guard: $$[$0],
          object: true
        });
break;
case 229:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])({
          source: $$[$0-2],
          step: $$[$0]
        });
break;
case 230:
this.$ = yy.addLocationDataFn(_$[$0-5], _$[$0])({
          source: $$[$0-4],
          guard: $$[$0-2],
          step: $$[$0]
        });
break;
case 231:
this.$ = yy.addLocationDataFn(_$[$0-5], _$[$0])({
          source: $$[$0-4],
          step: $$[$0-2],
          guard: $$[$0]
        });
break;
case 232:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])({
          source: $$[$0],
          from: true
        });
break;
case 233:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])({
          source: $$[$0-2],
          guard: $$[$0],
          from: true
        });
break;
case 234:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.Switch($$[$0-3], $$[$0-1]));
break;
case 235:
this.$ = yy.addLocationDataFn(_$[$0-6], _$[$0])(new yy.Switch($$[$0-5], $$[$0-3], $$[$0-1]));
break;
case 236:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.Switch(null, $$[$0-1]));
break;
case 237:
this.$ = yy.addLocationDataFn(_$[$0-5], _$[$0])(new yy.Switch(null, $$[$0-3], $$[$0-1]));
break;
case 239:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])($$[$0-1].concat($$[$0]));
break;
case 240:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])([[$$[$0-1], $$[$0]]]);
break;
case 241:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])([[$$[$0-2], $$[$0-1]]]);
break;
case 242:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.If($$[$0-1], $$[$0], {
          type: $$[$0-2]
        }));
break;
case 243:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])($$[$0-4].addElse(yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.If($$[$0-1], $$[$0], {
          type: $$[$0-2]
        }))));
break;
case 245:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])($$[$0-2].addElse($$[$0]));
break;
case 246: case 247:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.If($$[$0], yy.addLocationDataFn(_$[$0-2])(yy.Block.wrap([$$[$0-2]])), {
          type: $$[$0-1],
          statement: true
        }));
break;
case 250:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Op('-', $$[$0]));
break;
case 251:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Op('+', $$[$0]));
break;
case 252:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Op('--', $$[$0]));
break;
case 253:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Op('++', $$[$0]));
break;
case 254:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Op('--', $$[$0-1], null, true));
break;
case 255:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Op('++', $$[$0-1], null, true));
break;
case 256:
this.$ = yy.addLocationDataFn(_$[$0-1], _$[$0])(new yy.Existence($$[$0-1]));
break;
case 257:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Op('+', $$[$0-2], $$[$0]));
break;
case 258:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Op('-', $$[$0-2], $$[$0]));
break;
case 259: case 260: case 261: case 262: case 263: case 264: case 265: case 266: case 267: case 268:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Op($$[$0-1], $$[$0-2], $$[$0]));
break;
case 269:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])((function () {
        if ($$[$0-1].charAt(0) === '!') {
          return new yy.Op($$[$0-1].slice(1), $$[$0-2], $$[$0]).invert();
        } else {
          return new yy.Op($$[$0-1], $$[$0-2], $$[$0]);
        }
      }()));
break;
case 270:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Assign($$[$0-2], $$[$0], $$[$0-1]));
break;
case 271:
this.$ = yy.addLocationDataFn(_$[$0-4], _$[$0])(new yy.Assign($$[$0-4], $$[$0-1], $$[$0-3]));
break;
case 272:
this.$ = yy.addLocationDataFn(_$[$0-3], _$[$0])(new yy.Assign($$[$0-3], $$[$0], $$[$0-2]));
break;
case 273:
this.$ = yy.addLocationDataFn(_$[$0-2], _$[$0])(new yy.Extends($$[$0-2], $$[$0]));
break;
}
},
table: [{1:[2,1],3:1,4:2,5:3,7:4,8:5,9:6,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V1,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{1:[3]},{1:[2,2],6:$VG},o($VH,[2,3]),o($VH,[2,6],{141:77,132:102,138:103,133:$Vu,135:$Vv,139:$Vx,156:$VI,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($VH,[2,7],{141:77,132:105,138:106,133:$Vu,135:$Vv,139:$Vx,156:$VX}),o($VH,[2,8]),o($VY,[2,14],{109:107,78:108,86:114,40:$VZ,41:$VZ,114:$VZ,82:$V_,83:$V$,84:$V01,85:$V11,87:$V21,90:$V31,113:$V41}),o($VY,[2,15],{86:114,109:117,78:118,82:$V_,83:$V$,84:$V01,85:$V11,87:$V21,90:$V31,113:$V41,114:$VZ}),o($VY,[2,16]),o($VY,[2,17]),o($VY,[2,18]),o($VY,[2,19]),o($VY,[2,20]),o($VY,[2,21]),o($VY,[2,22]),o($VY,[2,23]),o($VY,[2,24]),o($VY,[2,25]),o($VY,[2,26]),o($V51,[2,9]),o($V51,[2,10]),o($V51,[2,11]),o($V51,[2,12]),o($V51,[2,13]),o([1,6,32,42,131,133,135,139,156,163,164,165,166,167,168,169,170,171,172,173,174],$V61,{15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,10:20,11:21,13:23,14:24,54:26,47:27,79:28,80:29,81:30,111:31,66:33,77:40,154:41,132:43,136:44,138:45,74:53,75:54,37:55,43:57,33:70,60:71,141:77,39:80,7:120,8:122,12:$V0,28:$V71,29:$V81,34:$V2,38:$V3,40:$V4,41:$V5,44:$V6,45:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,61:[1,119],62:$Vf,63:$Vg,67:$Vh,68:$Vi,92:$Vj,95:$Vk,97:$Vl,105:$Vm,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,137:$Vw,149:$Vy,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF}),o($V91,$Va1,{55:[1,124]}),o($V91,[2,95]),o($V91,[2,96]),o($V91,[2,97]),o($V91,[2,98]),o($Vb1,[2,162]),o([6,31,65,70],$Vc1,{64:125,71:126,72:127,33:129,60:130,74:131,75:132,34:$V2,73:$Vd1,92:$Vj,118:$Ve1,119:$Vf1}),{30:135,31:$Vg1},{7:137,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:138,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:139,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:140,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{15:142,16:143,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:144,60:71,74:53,75:54,77:141,79:28,80:29,81:30,92:$Vj,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,130:$Vt},{15:142,16:143,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:144,60:71,74:53,75:54,77:145,79:28,80:29,81:30,92:$Vj,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,130:$Vt},o($Vh1,$Vi1,{96:[1,149],161:[1,146],162:[1,147],175:[1,148]}),o($VY,[2,244],{151:[1,150]}),{30:151,31:$Vg1},{30:152,31:$Vg1},o($VY,[2,208]),{30:153,31:$Vg1},{7:154,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,31:[1,155],33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($Vj1,[2,115],{47:27,79:28,80:29,81:30,111:31,74:53,75:54,37:55,43:57,33:70,60:71,39:80,15:142,16:143,54:144,30:156,77:158,31:$Vg1,34:$V2,38:$V3,40:$V4,41:$V5,44:$V6,45:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,92:$Vj,96:[1,157],112:$Vn,117:$Vo,118:$Vp,119:$Vq,130:$Vt}),{7:159,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($V51,$Vk1,{15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,10:20,11:21,13:23,14:24,54:26,47:27,79:28,80:29,81:30,111:31,66:33,77:40,154:41,132:43,136:44,138:45,74:53,75:54,37:55,43:57,33:70,60:71,141:77,39:80,8:122,7:160,12:$V0,28:$V71,34:$V2,38:$V3,40:$V4,41:$V5,44:$V6,45:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,61:$Ve,62:$Vf,63:$Vg,67:$Vh,68:$Vi,92:$Vj,95:$Vk,97:$Vl,105:$Vm,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,137:$Vw,149:$Vy,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF}),o([1,6,31,32,42,70,94,131,133,135,139,156],[2,66]),{33:165,34:$V2,39:161,40:$V4,41:$V5,92:[1,164],98:162,99:163,104:$Vl1},{25:168,33:169,34:$V2,92:[1,167],95:$Vk,103:[1,170],107:[1,171]},o($Vh1,[2,92]),o($Vh1,[2,93]),o($V91,[2,40]),o($V91,[2,41]),o($V91,[2,42]),o($V91,[2,43]),o($V91,[2,44]),o($V91,[2,45]),o($V91,[2,46]),o($V91,[2,47]),{4:172,5:3,7:4,8:5,9:6,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V1,31:[1,173],33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:174,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,31:$Vm1,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,73:$Vn1,74:53,75:54,76:179,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,116:176,117:$Vo,118:$Vp,119:$Vq,120:$Vo1,123:177,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($V91,[2,169]),o($V91,[2,170],{35:181,36:$Vp1}),o([1,6,31,32,42,46,65,70,73,82,83,84,85,87,89,90,94,113,115,120,122,131,133,134,135,139,140,156,159,160,163,164,165,166,167,168,169,170,171,172,173,174],[2,163],{110:183,114:$Vq1}),{31:[2,69]},{31:[2,70]},o($Vr1,[2,87]),o($Vr1,[2,90]),{7:185,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:186,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:187,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:189,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,30:188,31:$Vg1,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{33:194,34:$V2,60:195,74:196,75:197,80:190,92:$Vj,118:$Ve1,119:$Vq,143:191,144:[1,192],145:193},{142:198,146:[1,199],147:[1,200],148:[1,201]},o([6,31,70,94],$Vs1,{39:80,93:202,56:203,57:204,59:205,11:206,37:207,33:208,35:209,60:210,34:$V2,36:$Vp1,38:$V3,40:$V4,41:$V5,62:$Vf,118:$Ve1}),o($Vt1,[2,34]),o($Vt1,[2,35]),o($V91,[2,38]),{15:142,16:211,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:144,60:71,74:53,75:54,77:212,79:28,80:29,81:30,92:$Vj,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,130:$Vt},o([1,6,29,31,32,40,41,42,55,58,65,70,73,82,83,84,85,87,89,90,94,96,102,113,114,115,120,122,131,133,134,135,139,140,146,147,148,156,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175],[2,32]),o($Vu1,[2,36]),{4:213,5:3,7:4,8:5,9:6,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V1,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($VH,[2,5],{7:4,8:5,9:6,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,10:20,11:21,13:23,14:24,54:26,47:27,79:28,80:29,81:30,111:31,66:33,77:40,154:41,132:43,136:44,138:45,74:53,75:54,37:55,43:57,33:70,60:71,141:77,39:80,5:214,12:$V0,28:$V1,34:$V2,38:$V3,40:$V4,41:$V5,44:$V6,45:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,61:$Ve,62:$Vf,63:$Vg,67:$Vh,68:$Vi,92:$Vj,95:$Vk,97:$Vl,105:$Vm,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,133:$Vu,135:$Vv,137:$Vw,139:$Vx,149:$Vy,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF}),o($VY,[2,256]),{7:215,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:216,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:217,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:218,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:219,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:220,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:221,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:222,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:223,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:224,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:225,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:226,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:227,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:228,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($VY,[2,207]),o($VY,[2,212]),{7:229,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($VY,[2,206]),o($VY,[2,211]),{39:230,40:$V4,41:$V5,110:231,114:$Vq1},o($Vr1,[2,88]),o($Vv1,[2,166]),{35:232,36:$Vp1},{35:233,36:$Vp1},o($Vr1,[2,103],{35:234,36:$Vp1}),{35:235,36:$Vp1},o($Vr1,[2,104]),{7:237,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,73:$Vw1,74:53,75:54,77:40,79:28,80:29,81:30,88:236,91:238,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,121:239,122:$Vx1,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{86:242,87:$V21,90:$V31},{110:243,114:$Vq1},o($Vr1,[2,89]),o($VH,[2,65],{15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,10:20,11:21,13:23,14:24,54:26,47:27,79:28,80:29,81:30,111:31,66:33,77:40,154:41,132:43,136:44,138:45,74:53,75:54,37:55,43:57,33:70,60:71,141:77,39:80,8:122,7:244,12:$V0,28:$V71,34:$V2,38:$V3,40:$V4,41:$V5,44:$V6,45:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,61:$Ve,62:$Vf,63:$Vg,67:$Vh,68:$Vi,92:$Vj,95:$Vk,97:$Vl,105:$Vm,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,133:$Vk1,135:$Vk1,139:$Vk1,156:$Vk1,137:$Vw,149:$Vy,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF}),o($Vy1,[2,28],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),{7:245,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{132:105,133:$Vu,135:$Vv,138:106,139:$Vx,141:77,156:$VX},o([1,6,31,32,42,65,70,73,89,94,115,120,122,131,133,134,135,139,140,156,163,164,165,166,167,168,169,170,171,172,173,174],$V61,{15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,10:20,11:21,13:23,14:24,54:26,47:27,79:28,80:29,81:30,111:31,66:33,77:40,154:41,132:43,136:44,138:45,74:53,75:54,37:55,43:57,33:70,60:71,141:77,39:80,7:120,8:122,12:$V0,28:$V71,29:$V81,34:$V2,38:$V3,40:$V4,41:$V5,44:$V6,45:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,61:$Ve,62:$Vf,63:$Vg,67:$Vh,68:$Vi,92:$Vj,95:$Vk,97:$Vl,105:$Vm,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,137:$Vw,149:$Vy,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF}),{6:[1,247],7:246,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,31:[1,248],33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o([6,31],$Vz1,{69:251,65:[1,249],70:$VA1}),o($VB1,[2,74]),o($VB1,[2,78],{55:[1,253],73:[1,252]}),o($VB1,[2,81]),o($VC1,[2,82]),o($VC1,[2,83]),o($VC1,[2,84]),o($VC1,[2,85]),{35:181,36:$Vp1},{7:254,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,31:$Vm1,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,73:$Vn1,74:53,75:54,76:179,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,116:176,117:$Vo,118:$Vp,119:$Vq,120:$Vo1,123:177,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($VY,[2,68]),{4:256,5:3,7:4,8:5,9:6,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V1,32:[1,255],33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o([1,6,31,32,42,65,70,73,89,94,115,120,122,131,133,134,135,139,140,156,159,160,164,165,166,167,168,169,170,171,172,173,174],[2,248],{141:77,132:102,138:103,163:$VL}),o($VD1,[2,249],{141:77,132:102,138:103,163:$VL,165:$VN}),o($VD1,[2,250],{141:77,132:102,138:103,163:$VL,165:$VN}),o($VD1,[2,251],{141:77,132:102,138:103,163:$VL,165:$VN}),o($VY,[2,252],{40:$Vi1,41:$Vi1,82:$Vi1,83:$Vi1,84:$Vi1,85:$Vi1,87:$Vi1,90:$Vi1,113:$Vi1,114:$Vi1}),o($Vv1,$VZ,{109:107,78:108,86:114,82:$V_,83:$V$,84:$V01,85:$V11,87:$V21,90:$V31,113:$V41}),{78:118,82:$V_,83:$V$,84:$V01,85:$V11,86:114,87:$V21,90:$V31,109:117,113:$V41,114:$VZ},o($VE1,$Va1),o($VY,[2,253],{40:$Vi1,41:$Vi1,82:$Vi1,83:$Vi1,84:$Vi1,85:$Vi1,87:$Vi1,90:$Vi1,113:$Vi1,114:$Vi1}),o($VY,[2,254]),o($VY,[2,255]),{6:[1,259],7:257,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,31:[1,258],33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:260,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{30:261,31:$Vg1,155:[1,262]},o($VY,[2,191],{126:263,127:[1,264],128:[1,265]}),o($VY,[2,205]),o($VY,[2,213]),{31:[1,266],132:102,133:$Vu,135:$Vv,138:103,139:$Vx,141:77,156:$VI,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW},{150:267,152:268,153:$VF1},o($VY,[2,116]),{7:270,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($Vj1,[2,119],{30:271,31:$Vg1,40:$Vi1,41:$Vi1,82:$Vi1,83:$Vi1,84:$Vi1,85:$Vi1,87:$Vi1,90:$Vi1,113:$Vi1,114:$Vi1,96:[1,272]}),o($Vy1,[2,198],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($V51,$VG1,{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($V51,[2,123]),{29:[1,273],70:[1,274]},{29:[1,275]},{31:$VH1,33:280,34:$V2,94:[1,276],100:277,101:278,103:$VI1},o([29,70],[2,139]),{102:[1,282]},{31:$VJ1,33:287,34:$V2,94:[1,283],103:$VK1,106:284,108:285},o($V51,[2,143]),{55:[1,289]},{7:290,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{29:[1,291]},{6:$VG,131:[1,292]},{4:293,5:3,7:4,8:5,9:6,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V1,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o([6,31,70,120],$VL1,{141:77,132:102,138:103,121:294,73:[1,295],122:$Vx1,133:$Vu,135:$Vv,139:$Vx,156:$VI,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($VM1,[2,172]),o([6,31,120],$Vz1,{69:296,70:$VN1}),o($VO1,[2,181]),{7:254,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,31:$Vm1,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,73:$Vn1,74:53,75:54,76:179,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,116:298,117:$Vo,118:$Vp,119:$Vq,123:177,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($VO1,[2,187]),o($VO1,[2,188]),o($VP1,[2,171]),o($VP1,[2,33]),o($Vb1,[2,164]),{7:254,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,31:$Vm1,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,73:$Vn1,74:53,75:54,76:179,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,115:[1,299],116:300,117:$Vo,118:$Vp,119:$Vq,123:177,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{30:301,31:$Vg1,132:102,133:$Vu,135:$Vv,138:103,139:$Vx,141:77,156:$VI,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW},o($VQ1,[2,201],{141:77,132:102,138:103,133:$Vu,134:[1,302],135:$Vv,139:$Vx,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($VQ1,[2,203],{141:77,132:102,138:103,133:$Vu,134:[1,303],135:$Vv,139:$Vx,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($VY,[2,209]),o($VR1,[2,210],{141:77,132:102,138:103,133:$Vu,135:$Vv,139:$Vx,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o([1,6,31,32,42,65,70,73,89,94,115,120,122,131,133,134,135,139,156,159,160,163,164,165,166,167,168,169,170,171,172,173,174],[2,214],{140:[1,304]}),o($VS1,[2,217]),{33:194,34:$V2,60:195,74:196,75:197,92:$Vj,118:$Ve1,119:$Vf1,143:305,145:193},o($VS1,[2,223],{70:[1,306]}),o($VT1,[2,219]),o($VT1,[2,220]),o($VT1,[2,221]),o($VT1,[2,222]),o($VY,[2,216]),{7:307,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:308,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:309,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($VU1,$Vz1,{69:310,70:$VV1}),o($VW1,[2,111]),o($VW1,[2,51],{58:[1,312]}),o($VX1,[2,60],{55:[1,313]}),o($VW1,[2,56]),o($VX1,[2,61]),o($VY1,[2,57]),o($VY1,[2,58]),o($VY1,[2,59]),{46:[1,314],78:118,82:$V_,83:$V$,84:$V01,85:$V11,86:114,87:$V21,90:$V31,109:117,113:$V41,114:$VZ},o($VE1,$Vi1),{6:$VG,42:[1,315]},o($VH,[2,4]),o($VZ1,[2,257],{141:77,132:102,138:103,163:$VL,164:$VM,165:$VN}),o($VZ1,[2,258],{141:77,132:102,138:103,163:$VL,164:$VM,165:$VN}),o($VD1,[2,259],{141:77,132:102,138:103,163:$VL,165:$VN}),o($VD1,[2,260],{141:77,132:102,138:103,163:$VL,165:$VN}),o([1,6,31,32,42,65,70,73,89,94,115,120,122,131,133,134,135,139,140,156,166,167,168,169,170,171,172,173,174],[2,261],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN}),o([1,6,31,32,42,65,70,73,89,94,115,120,122,131,133,134,135,139,140,156,167,168,169,170,171,172,173],[2,262],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,174:$VW}),o([1,6,31,32,42,65,70,73,89,94,115,120,122,131,133,134,135,139,140,156,168,169,170,171,172,173],[2,263],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,174:$VW}),o([1,6,31,32,42,65,70,73,89,94,115,120,122,131,133,134,135,139,140,156,169,170,171,172,173],[2,264],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,174:$VW}),o([1,6,31,32,42,65,70,73,89,94,115,120,122,131,133,134,135,139,140,156,170,171,172,173],[2,265],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,174:$VW}),o([1,6,31,32,42,65,70,73,89,94,115,120,122,131,133,134,135,139,140,156,171,172,173],[2,266],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,174:$VW}),o([1,6,31,32,42,65,70,73,89,94,115,120,122,131,133,134,135,139,140,156,172,173],[2,267],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,174:$VW}),o([1,6,31,32,42,65,70,73,89,94,115,120,122,131,133,134,135,139,140,156,173],[2,268],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,174:$VW}),o([1,6,31,32,42,65,70,73,89,94,115,120,122,131,133,134,135,139,140,156,167,168,169,170,171,172,173,174],[2,269],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO}),o($VR1,[2,247],{141:77,132:102,138:103,133:$Vu,135:$Vv,139:$Vx,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($VR1,[2,246],{141:77,132:102,138:103,133:$Vu,135:$Vv,139:$Vx,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($Vb1,[2,159]),o($Vb1,[2,160]),o($Vr1,[2,99]),o($Vr1,[2,100]),o($Vr1,[2,101]),o($Vr1,[2,102]),{89:[1,316]},{73:$Vw1,89:[2,107],121:317,122:$Vx1,132:102,133:$Vu,135:$Vv,138:103,139:$Vx,141:77,156:$VI,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW},{89:[2,108]},{7:318,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,89:[2,180],92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($V_1,[2,174]),o($V_1,$V$1),o($Vr1,[2,106]),o($Vb1,[2,161]),o($VH,[2,64],{141:77,132:102,138:103,133:$VG1,135:$VG1,139:$VG1,156:$VG1,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($Vy1,[2,29],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($Vy1,[2,48],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),{7:319,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:320,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{66:321,67:$Vh,68:$Vi},o($V02,$V12,{72:127,33:129,60:130,74:131,75:132,71:322,34:$V2,73:$Vd1,92:$Vj,118:$Ve1,119:$Vf1}),{6:$V22,31:$V32},o($VB1,[2,79]),{7:325,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($VO1,$VL1,{141:77,132:102,138:103,73:[1,326],133:$Vu,135:$Vv,139:$Vx,156:$VI,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($V42,[2,30]),{6:$VG,32:[1,327]},o($Vy1,[2,270],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),{7:328,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:329,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($Vy1,[2,273],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($VY,[2,245]),{7:330,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($VY,[2,192],{127:[1,331]}),{30:332,31:$Vg1},{30:335,31:$Vg1,33:333,34:$V2,75:334,92:$Vj},{150:336,152:268,153:$VF1},{32:[1,337],151:[1,338],152:339,153:$VF1},o($V52,[2,238]),{7:341,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,124:340,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($V62,[2,117],{141:77,132:102,138:103,30:342,31:$Vg1,133:$Vu,135:$Vv,139:$Vx,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($VY,[2,120]),{7:343,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{39:344,40:$V4,41:$V5},{92:[1,346],99:345,104:$Vl1},{39:347,40:$V4,41:$V5},{29:[1,348]},o($VU1,$Vz1,{69:349,70:$V72}),o($VW1,[2,130]),{31:$VH1,33:280,34:$V2,100:351,101:278,103:$VI1},o($VW1,[2,135],{102:[1,352]}),o($VW1,[2,137],{102:[1,353]}),{33:354,34:$V2},o($V51,[2,141]),o($VU1,$Vz1,{69:355,70:$V82}),o($VW1,[2,150]),{31:$VJ1,33:287,34:$V2,103:$VK1,106:357,108:285},o($VW1,[2,155],{102:[1,358]}),o($VW1,[2,158]),{6:[1,360],7:359,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,31:[1,361],33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($V92,[2,147],{141:77,132:102,138:103,133:$Vu,135:$Vv,139:$Vx,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),{39:362,40:$V4,41:$V5},o($V91,[2,199]),{6:$VG,32:[1,363]},{7:364,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o([12,28,34,38,40,41,44,45,48,49,50,51,52,53,61,62,63,67,68,92,95,97,105,112,117,118,119,125,129,130,133,135,137,139,149,155,157,158,159,160,161,162],$V$1,{6:$Va2,31:$Va2,70:$Va2,120:$Va2}),{6:$Vb2,31:$Vc2,120:[1,365]},o([6,31,32,115,120],$V12,{15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,10:20,11:21,13:23,14:24,54:26,47:27,79:28,80:29,81:30,111:31,66:33,77:40,154:41,132:43,136:44,138:45,74:53,75:54,37:55,43:57,33:70,60:71,141:77,39:80,8:122,76:179,7:254,123:368,12:$V0,28:$V71,34:$V2,38:$V3,40:$V4,41:$V5,44:$V6,45:$V7,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,61:$Ve,62:$Vf,63:$Vg,67:$Vh,68:$Vi,73:$Vn1,92:$Vj,95:$Vk,97:$Vl,105:$Vm,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,133:$Vu,135:$Vv,137:$Vw,139:$Vx,149:$Vy,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF}),o($V02,$Vz1,{69:369,70:$VN1}),o($Vb1,[2,167]),o([6,31,115],$Vz1,{69:370,70:$VN1}),o($Vd2,[2,242]),{7:371,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:372,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:373,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($VS1,[2,218]),{33:194,34:$V2,60:195,74:196,75:197,92:$Vj,118:$Ve1,119:$Vf1,145:374},o([1,6,31,32,42,65,70,73,89,94,115,120,122,131,133,135,139,156],[2,225],{141:77,132:102,138:103,134:[1,375],140:[1,376],159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($Ve2,[2,226],{141:77,132:102,138:103,134:[1,377],159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($Ve2,[2,232],{141:77,132:102,138:103,134:[1,378],159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),{6:$Vf2,31:$Vg2,94:[1,379]},o($Vh2,$V12,{39:80,57:204,59:205,11:206,37:207,33:208,35:209,60:210,56:382,34:$V2,36:$Vp1,38:$V3,40:$V4,41:$V5,62:$Vf,118:$Ve1}),{7:383,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,31:[1,384],33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:385,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,31:[1,386],33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($V91,[2,39]),o($Vu1,[2,37]),o($Vr1,[2,105]),{7:387,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,89:[2,178],92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{89:[2,179],132:102,133:$Vu,135:$Vv,138:103,139:$Vx,141:77,156:$VI,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW},o($Vy1,[2,49],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),{32:[1,388],132:102,133:$Vu,135:$Vv,138:103,139:$Vx,141:77,156:$VI,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW},{30:389,31:$Vg1},o($VB1,[2,75]),{33:129,34:$V2,60:130,71:390,72:127,73:$Vd1,74:131,75:132,92:$Vj,118:$Ve1,119:$Vf1},o($Vi2,$Vc1,{71:126,72:127,33:129,60:130,74:131,75:132,64:391,34:$V2,73:$Vd1,92:$Vj,118:$Ve1,119:$Vf1}),o($VB1,[2,80],{141:77,132:102,138:103,133:$Vu,135:$Vv,139:$Vx,156:$VI,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($VO1,$Va2),o($V42,[2,31]),{32:[1,392],132:102,133:$Vu,135:$Vv,138:103,139:$Vx,141:77,156:$VI,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW},o($Vy1,[2,272],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),{30:393,31:$Vg1,132:102,133:$Vu,135:$Vv,138:103,139:$Vx,141:77,156:$VI,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW},{30:394,31:$Vg1},o($VY,[2,193]),{30:395,31:$Vg1},{30:396,31:$Vg1},o($Vj2,[2,197]),{32:[1,397],151:[1,398],152:339,153:$VF1},o($VY,[2,236]),{30:399,31:$Vg1},o($V52,[2,239]),{30:400,31:$Vg1,70:[1,401]},o($Vk2,[2,189],{141:77,132:102,138:103,133:$Vu,135:$Vv,139:$Vx,156:$VI,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($VY,[2,118]),o($V62,[2,121],{141:77,132:102,138:103,30:402,31:$Vg1,133:$Vu,135:$Vv,139:$Vx,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($V51,[2,124]),{29:[1,403]},{31:$VH1,33:280,34:$V2,100:404,101:278,103:$VI1},o($V51,[2,125]),{39:405,40:$V4,41:$V5},{6:$Vl2,31:$Vm2,94:[1,406]},o($Vh2,$V12,{33:280,101:409,34:$V2,103:$VI1}),o($V02,$Vz1,{69:410,70:$V72}),{33:411,34:$V2},{33:412,34:$V2},{29:[2,140]},{6:$Vn2,31:$Vo2,94:[1,413]},o($Vh2,$V12,{33:287,108:416,34:$V2,103:$VK1}),o($V02,$Vz1,{69:417,70:$V82}),{33:418,34:$V2,103:[1,419]},o($V92,[2,144],{141:77,132:102,138:103,133:$Vu,135:$Vv,139:$Vx,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),{7:420,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:421,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($V51,[2,148]),{131:[1,422]},{120:[1,423],132:102,133:$Vu,135:$Vv,138:103,139:$Vx,141:77,156:$VI,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW},o($VM1,[2,173]),{7:254,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,73:$Vn1,74:53,75:54,76:179,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,123:424,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:254,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,31:$Vm1,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,73:$Vn1,74:53,75:54,76:179,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,116:425,117:$Vo,118:$Vp,119:$Vq,123:177,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($VO1,[2,182]),{6:$Vb2,31:$Vc2,32:[1,426]},{6:$Vb2,31:$Vc2,115:[1,427]},o($VR1,[2,202],{141:77,132:102,138:103,133:$Vu,135:$Vv,139:$Vx,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($VR1,[2,204],{141:77,132:102,138:103,133:$Vu,135:$Vv,139:$Vx,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($VR1,[2,215],{141:77,132:102,138:103,133:$Vu,135:$Vv,139:$Vx,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($VS1,[2,224]),{7:428,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:429,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:430,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:431,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($VM1,[2,109]),{11:206,33:208,34:$V2,35:209,36:$Vp1,37:207,38:$V3,39:80,40:$V4,41:$V5,56:432,57:204,59:205,60:210,62:$Vf,118:$Ve1},o($Vi2,$Vs1,{39:80,56:203,57:204,59:205,11:206,37:207,33:208,35:209,60:210,93:433,34:$V2,36:$Vp1,38:$V3,40:$V4,41:$V5,62:$Vf,118:$Ve1}),o($VW1,[2,112]),o($VW1,[2,52],{141:77,132:102,138:103,133:$Vu,135:$Vv,139:$Vx,156:$VI,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),{7:434,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($VW1,[2,54],{141:77,132:102,138:103,133:$Vu,135:$Vv,139:$Vx,156:$VI,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),{7:435,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{89:[2,177],132:102,133:$Vu,135:$Vv,138:103,139:$Vx,141:77,156:$VI,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW},o($VY,[2,50]),o($VY,[2,67]),o($VB1,[2,76]),o($V02,$Vz1,{69:436,70:$VA1}),o($VY,[2,271]),o($Vd2,[2,243]),o($VY,[2,194]),o($Vj2,[2,195]),o($Vj2,[2,196]),o($VY,[2,234]),{30:437,31:$Vg1},{32:[1,438]},o($V52,[2,240],{6:[1,439]}),{7:440,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},o($VY,[2,122]),{39:441,40:$V4,41:$V5},o($VU1,$Vz1,{69:442,70:$V72}),o($V51,[2,126]),{29:[1,443]},{33:280,34:$V2,101:444,103:$VI1},{31:$VH1,33:280,34:$V2,100:445,101:278,103:$VI1},o($VW1,[2,131]),{6:$Vl2,31:$Vm2,32:[1,446]},o($VW1,[2,136]),o($VW1,[2,138]),o($V51,[2,142],{29:[1,447]}),{33:287,34:$V2,103:$VK1,108:448},{31:$VJ1,33:287,34:$V2,103:$VK1,106:449,108:285},o($VW1,[2,151]),{6:$Vn2,31:$Vo2,32:[1,450]},o($VW1,[2,156]),o($VW1,[2,157]),o($V92,[2,145],{141:77,132:102,138:103,133:$Vu,135:$Vv,139:$Vx,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),{32:[1,451],132:102,133:$Vu,135:$Vv,138:103,139:$Vx,141:77,156:$VI,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW},o($V91,[2,200]),o($V91,[2,176]),o($VO1,[2,183]),o($V02,$Vz1,{69:452,70:$VN1}),o($VO1,[2,184]),o($Vb1,[2,168]),o([1,6,31,32,42,65,70,73,89,94,115,120,122,131,133,134,135,139,156],[2,227],{141:77,132:102,138:103,140:[1,453],159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($Ve2,[2,229],{141:77,132:102,138:103,134:[1,454],159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($Vy1,[2,228],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($Vy1,[2,233],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($VW1,[2,113]),o($V02,$Vz1,{69:455,70:$VV1}),{32:[1,456],132:102,133:$Vu,135:$Vv,138:103,139:$Vx,141:77,156:$VI,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW},{32:[1,457],132:102,133:$Vu,135:$Vv,138:103,139:$Vx,141:77,156:$VI,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW},{6:$V22,31:$V32,32:[1,458]},{32:[1,459]},o($VY,[2,237]),o($V52,[2,241]),o($Vk2,[2,190],{141:77,132:102,138:103,133:$Vu,135:$Vv,139:$Vx,156:$VI,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($V51,[2,128]),{6:$Vl2,31:$Vm2,94:[1,460]},{39:461,40:$V4,41:$V5},o($VW1,[2,132]),o($V02,$Vz1,{69:462,70:$V72}),o($VW1,[2,133]),{39:463,40:$V4,41:$V5},o($VW1,[2,152]),o($V02,$Vz1,{69:464,70:$V82}),o($VW1,[2,153]),o($V51,[2,146]),{6:$Vb2,31:$Vc2,32:[1,465]},{7:466,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{7:467,8:122,10:20,11:21,12:$V0,13:23,14:24,15:7,16:8,17:9,18:10,19:11,20:12,21:13,22:14,23:15,24:16,25:17,26:18,27:19,28:$V71,33:70,34:$V2,37:55,38:$V3,39:80,40:$V4,41:$V5,43:57,44:$V6,45:$V7,47:27,48:$V8,49:$V9,50:$Va,51:$Vb,52:$Vc,53:$Vd,54:26,60:71,61:$Ve,62:$Vf,63:$Vg,66:33,67:$Vh,68:$Vi,74:53,75:54,77:40,79:28,80:29,81:30,92:$Vj,95:$Vk,97:$Vl,105:$Vm,111:31,112:$Vn,117:$Vo,118:$Vp,119:$Vq,125:$Vr,129:$Vs,130:$Vt,132:43,133:$Vu,135:$Vv,136:44,137:$Vw,138:45,139:$Vx,141:77,149:$Vy,154:41,155:$Vz,157:$VA,158:$VB,159:$VC,160:$VD,161:$VE,162:$VF},{6:$Vf2,31:$Vg2,32:[1,468]},o($VW1,[2,53]),o($VW1,[2,55]),o($VB1,[2,77]),o($VY,[2,235]),{29:[1,469]},o($V51,[2,127]),{6:$Vl2,31:$Vm2,32:[1,470]},o($V51,[2,149]),{6:$Vn2,31:$Vo2,32:[1,471]},o($VO1,[2,185]),o($Vy1,[2,230],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($Vy1,[2,231],{141:77,132:102,138:103,159:$VJ,160:$VK,163:$VL,164:$VM,165:$VN,166:$VO,167:$VP,168:$VQ,169:$VR,170:$VS,171:$VT,172:$VU,173:$VV,174:$VW}),o($VW1,[2,114]),{39:472,40:$V4,41:$V5},o($VW1,[2,134]),o($VW1,[2,154]),o($V51,[2,129])],
defaultActions: {68:[2,69],69:[2,70],238:[2,108],354:[2,140]},
parseError: function parseError(str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        function _parseError (msg, hash) {
            this.message = msg;
            this.hash = hash;
        }
        _parseError.prototype = Error;

        throw new _parseError(str, hash);
    }
},
parse: function parse(input) {
    var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    var lexer = Object.create(this.lexer);
    var sharedState = { yy: {} };
    for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
            sharedState.yy[k] = this.yy[k];
        }
    }
    lexer.setInput(input, sharedState.yy);
    sharedState.yy.lexer = lexer;
    sharedState.yy.parser = this;
    if (typeof lexer.yylloc == 'undefined') {
        lexer.yylloc = {};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);
    var ranges = lexer.options && lexer.options.ranges;
    if (typeof sharedState.yy.parseError === 'function') {
        this.parseError = sharedState.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    _token_stack:
        var lex = function () {
            var token;
            token = lexer.lex() || EOF;
            if (typeof token !== 'number') {
                token = self.symbols_[token] || token;
            }
            return token;
        };
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(lexer.yytext);
            lstack.push(lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = lexer.yyleng;
                yytext = lexer.yytext;
                yylineno = lexer.yylineno;
                yyloc = lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                sharedState.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};

function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();


if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = parser;
exports.Parser = parser.Parser;
exports.parse = function () { return parser.parse.apply(parser, arguments); };
exports.main = function commonjsMain(args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(process.argv.slice(1));
}
}
}).call(this,require('_process'))
},{"_process":40,"fs":34,"path":39}],20:[function(require,module,exports){
// Generated by CoffeeScript 1.12.2
(function() {
  var CoffeeScript, Module, binary, child_process, ext, findExtension, fork, helpers, i, len, loadFile, path, ref;

  CoffeeScript = require('./coffee-script');

  child_process = require('child_process');

  helpers = require('./helpers');

  path = require('path');

  loadFile = function(module, filename) {
    var answer;
    answer = CoffeeScript._compileFile(filename, false, true);
    return module._compile(answer, filename);
  };

  if (require.extensions) {
    ref = CoffeeScript.FILE_EXTENSIONS;
    for (i = 0, len = ref.length; i < len; i++) {
      ext = ref[i];
      require.extensions[ext] = loadFile;
    }
    Module = require('module');
    findExtension = function(filename) {
      var curExtension, extensions;
      extensions = path.basename(filename).split('.');
      if (extensions[0] === '') {
        extensions.shift();
      }
      while (extensions.shift()) {
        curExtension = '.' + extensions.join('.');
        if (Module._extensions[curExtension]) {
          return curExtension;
        }
      }
      return '.js';
    };
    Module.prototype.load = function(filename) {
      var extension;
      this.filename = filename;
      this.paths = Module._nodeModulePaths(path.dirname(filename));
      extension = findExtension(filename);
      Module._extensions[extension](this, filename);
      return this.loaded = true;
    };
  }

  if (child_process) {
    fork = child_process.fork;
    binary = null;
    // binary = require.resolve('../../bin/coffee');
    child_process.fork = function(path, args, options) {
      if (helpers.isCoffee(path)) {
        if (!Array.isArray(args)) {
          options = args || {};
          args = [];
        }
        args = [path].concat(args);
        path = binary;
      }
      return fork(path, args, options);
    };
  }

}).call(this);

},{"./coffee-script":15,"./helpers":16,"child_process":34,"module":34,"path":39}],21:[function(require,module,exports){
// Generated by CoffeeScript 1.12.2
(function() {
  var BALANCED_PAIRS, CALL_CLOSERS, EXPRESSION_CLOSE, EXPRESSION_END, EXPRESSION_START, IMPLICIT_CALL, IMPLICIT_END, IMPLICIT_FUNC, IMPLICIT_UNSPACED_CALL, INVERSES, LINEBREAKS, SINGLE_CLOSERS, SINGLE_LINERS, generate, k, left, len, ref, rite,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    slice = [].slice;

  generate = function(tag, value, origin) {
    var tok;
    tok = [tag, value];
    tok.generated = true;
    if (origin) {
      tok.origin = origin;
    }
    return tok;
  };

  exports.Rewriter = (function() {
    function Rewriter() {}

    Rewriter.prototype.rewrite = function(tokens1) {
      this.tokens = tokens1;
      this.removeLeadingNewlines();
      this.closeOpenCalls();
      this.closeOpenIndexes();
      this.normalizeLines();
      this.tagPostfixConditionals();
      this.addImplicitBracesAndParens();
      this.addLocationDataToGeneratedTokens();
      this.fixOutdentLocationData();
      return this.tokens;
    };

    Rewriter.prototype.scanTokens = function(block) {
      var i, token, tokens;
      tokens = this.tokens;
      i = 0;
      while (token = tokens[i]) {
        i += block.call(this, token, i, tokens);
      }
      return true;
    };

    Rewriter.prototype.detectEnd = function(i, condition, action) {
      var levels, ref, ref1, token, tokens;
      tokens = this.tokens;
      levels = 0;
      while (token = tokens[i]) {
        if (levels === 0 && condition.call(this, token, i)) {
          return action.call(this, token, i);
        }
        if (!token || levels < 0) {
          return action.call(this, token, i - 1);
        }
        if (ref = token[0], indexOf.call(EXPRESSION_START, ref) >= 0) {
          levels += 1;
        } else if (ref1 = token[0], indexOf.call(EXPRESSION_END, ref1) >= 0) {
          levels -= 1;
        }
        i += 1;
      }
      return i - 1;
    };

    Rewriter.prototype.removeLeadingNewlines = function() {
      var i, k, len, ref, tag;
      ref = this.tokens;
      for (i = k = 0, len = ref.length; k < len; i = ++k) {
        tag = ref[i][0];
        if (tag !== 'TERMINATOR') {
          break;
        }
      }
      if (i) {
        return this.tokens.splice(0, i);
      }
    };

    Rewriter.prototype.closeOpenCalls = function() {
      var action, condition;
      condition = function(token, i) {
        var ref;
        return ((ref = token[0]) === ')' || ref === 'CALL_END') || token[0] === 'OUTDENT' && this.tag(i - 1) === ')';
      };
      action = function(token, i) {
        return this.tokens[token[0] === 'OUTDENT' ? i - 1 : i][0] = 'CALL_END';
      };
      return this.scanTokens(function(token, i) {
        if (token[0] === 'CALL_START') {
          this.detectEnd(i + 1, condition, action);
        }
        return 1;
      });
    };

    Rewriter.prototype.closeOpenIndexes = function() {
      var action, condition;
      condition = function(token, i) {
        var ref;
        return (ref = token[0]) === ']' || ref === 'INDEX_END';
      };
      action = function(token, i) {
        return token[0] = 'INDEX_END';
      };
      return this.scanTokens(function(token, i) {
        if (token[0] === 'INDEX_START') {
          this.detectEnd(i + 1, condition, action);
        }
        return 1;
      });
    };

    Rewriter.prototype.indexOfTag = function() {
      var fuzz, i, j, k, pattern, ref, ref1;
      i = arguments[0], pattern = 2 <= arguments.length ? slice.call(arguments, 1) : [];
      fuzz = 0;
      for (j = k = 0, ref = pattern.length; 0 <= ref ? k < ref : k > ref; j = 0 <= ref ? ++k : --k) {
        while (this.tag(i + j + fuzz) === 'HERECOMMENT') {
          fuzz += 2;
        }
        if (pattern[j] == null) {
          continue;
        }
        if (typeof pattern[j] === 'string') {
          pattern[j] = [pattern[j]];
        }
        if (ref1 = this.tag(i + j + fuzz), indexOf.call(pattern[j], ref1) < 0) {
          return -1;
        }
      }
      return i + j + fuzz - 1;
    };

    Rewriter.prototype.looksObjectish = function(j) {
      var end, index;
      if (this.indexOfTag(j, '@', null, ':') > -1 || this.indexOfTag(j, null, ':') > -1) {
        return true;
      }
      index = this.indexOfTag(j, EXPRESSION_START);
      if (index > -1) {
        end = null;
        this.detectEnd(index + 1, (function(token) {
          var ref;
          return ref = token[0], indexOf.call(EXPRESSION_END, ref) >= 0;
        }), (function(token, i) {
          return end = i;
        }));
        if (this.tag(end + 1) === ':') {
          return true;
        }
      }
      return false;
    };

    Rewriter.prototype.findTagsBackwards = function(i, tags) {
      var backStack, ref, ref1, ref2, ref3, ref4, ref5;
      backStack = [];
      while (i >= 0 && (backStack.length || (ref2 = this.tag(i), indexOf.call(tags, ref2) < 0) && ((ref3 = this.tag(i), indexOf.call(EXPRESSION_START, ref3) < 0) || this.tokens[i].generated) && (ref4 = this.tag(i), indexOf.call(LINEBREAKS, ref4) < 0))) {
        if (ref = this.tag(i), indexOf.call(EXPRESSION_END, ref) >= 0) {
          backStack.push(this.tag(i));
        }
        if ((ref1 = this.tag(i), indexOf.call(EXPRESSION_START, ref1) >= 0) && backStack.length) {
          backStack.pop();
        }
        i -= 1;
      }
      return ref5 = this.tag(i), indexOf.call(tags, ref5) >= 0;
    };

    Rewriter.prototype.addImplicitBracesAndParens = function() {
      var stack, start;
      stack = [];
      start = null;
      return this.scanTokens(function(token, i, tokens) {
        var endImplicitCall, endImplicitObject, forward, inImplicit, inImplicitCall, inImplicitControl, inImplicitObject, newLine, nextTag, offset, prevTag, prevToken, ref, ref1, ref2, ref3, ref4, ref5, s, sameLine, stackIdx, stackTag, stackTop, startIdx, startImplicitCall, startImplicitObject, startsLine, tag;
        tag = token[0];
        prevTag = (prevToken = i > 0 ? tokens[i - 1] : [])[0];
        nextTag = (i < tokens.length - 1 ? tokens[i + 1] : [])[0];
        stackTop = function() {
          return stack[stack.length - 1];
        };
        startIdx = i;
        forward = function(n) {
          return i - startIdx + n;
        };
        inImplicit = function() {
          var ref, ref1;
          return (ref = stackTop()) != null ? (ref1 = ref[2]) != null ? ref1.ours : void 0 : void 0;
        };
        inImplicitCall = function() {
          var ref;
          return inImplicit() && ((ref = stackTop()) != null ? ref[0] : void 0) === '(';
        };
        inImplicitObject = function() {
          var ref;
          return inImplicit() && ((ref = stackTop()) != null ? ref[0] : void 0) === '{';
        };
        inImplicitControl = function() {
          var ref;
          return inImplicit && ((ref = stackTop()) != null ? ref[0] : void 0) === 'CONTROL';
        };
        startImplicitCall = function(j) {
          var idx;
          idx = j != null ? j : i;
          stack.push([
            '(', idx, {
              ours: true
            }
          ]);
          tokens.splice(idx, 0, generate('CALL_START', '('));
          if (j == null) {
            return i += 1;
          }
        };
        endImplicitCall = function() {
          stack.pop();
          tokens.splice(i, 0, generate('CALL_END', ')', ['', 'end of input', token[2]]));
          return i += 1;
        };
        startImplicitObject = function(j, startsLine) {
          var idx, val;
          if (startsLine == null) {
            startsLine = true;
          }
          idx = j != null ? j : i;
          stack.push([
            '{', idx, {
              sameLine: true,
              startsLine: startsLine,
              ours: true
            }
          ]);
          val = new String('{');
          val.generated = true;
          tokens.splice(idx, 0, generate('{', val, token));
          if (j == null) {
            return i += 1;
          }
        };
        endImplicitObject = function(j) {
          j = j != null ? j : i;
          stack.pop();
          tokens.splice(j, 0, generate('}', '}', token));
          return i += 1;
        };
        if (inImplicitCall() && (tag === 'IF' || tag === 'TRY' || tag === 'FINALLY' || tag === 'CATCH' || tag === 'CLASS' || tag === 'SWITCH')) {
          stack.push([
            'CONTROL', i, {
              ours: true
            }
          ]);
          return forward(1);
        }
        if (tag === 'INDENT' && inImplicit()) {
          if (prevTag !== '=>' && prevTag !== '->' && prevTag !== '[' && prevTag !== '(' && prevTag !== ',' && prevTag !== '{' && prevTag !== 'TRY' && prevTag !== 'ELSE' && prevTag !== '=') {
            while (inImplicitCall()) {
              endImplicitCall();
            }
          }
          if (inImplicitControl()) {
            stack.pop();
          }
          stack.push([tag, i]);
          return forward(1);
        }
        if (indexOf.call(EXPRESSION_START, tag) >= 0) {
          stack.push([tag, i]);
          return forward(1);
        }
        if (indexOf.call(EXPRESSION_END, tag) >= 0) {
          while (inImplicit()) {
            if (inImplicitCall()) {
              endImplicitCall();
            } else if (inImplicitObject()) {
              endImplicitObject();
            } else {
              stack.pop();
            }
          }
          start = stack.pop();
        }
        if ((indexOf.call(IMPLICIT_FUNC, tag) >= 0 && token.spaced || tag === '?' && i > 0 && !tokens[i - 1].spaced) && (indexOf.call(IMPLICIT_CALL, nextTag) >= 0 || indexOf.call(IMPLICIT_UNSPACED_CALL, nextTag) >= 0 && !((ref = tokens[i + 1]) != null ? ref.spaced : void 0) && !((ref1 = tokens[i + 1]) != null ? ref1.newLine : void 0))) {
          if (tag === '?') {
            tag = token[0] = 'FUNC_EXIST';
          }
          startImplicitCall(i + 1);
          return forward(2);
        }
        if (indexOf.call(IMPLICIT_FUNC, tag) >= 0 && this.indexOfTag(i + 1, 'INDENT') > -1 && this.looksObjectish(i + 2) && !this.findTagsBackwards(i, ['CLASS', 'EXTENDS', 'IF', 'CATCH', 'SWITCH', 'LEADING_WHEN', 'FOR', 'WHILE', 'UNTIL'])) {
          startImplicitCall(i + 1);
          stack.push(['INDENT', i + 2]);
          return forward(3);
        }
        if (tag === ':') {
          s = (function() {
            var ref2;
            switch (false) {
              case ref2 = this.tag(i - 1), indexOf.call(EXPRESSION_END, ref2) < 0:
                return start[1];
              case this.tag(i - 2) !== '@':
                return i - 2;
              default:
                return i - 1;
            }
          }).call(this);
          while (this.tag(s - 2) === 'HERECOMMENT') {
            s -= 2;
          }
          this.insideForDeclaration = nextTag === 'FOR';
          startsLine = s === 0 || (ref2 = this.tag(s - 1), indexOf.call(LINEBREAKS, ref2) >= 0) || tokens[s - 1].newLine;
          if (stackTop()) {
            ref3 = stackTop(), stackTag = ref3[0], stackIdx = ref3[1];
            if ((stackTag === '{' || stackTag === 'INDENT' && this.tag(stackIdx - 1) === '{') && (startsLine || this.tag(s - 1) === ',' || this.tag(s - 1) === '{')) {
              return forward(1);
            }
          }
          startImplicitObject(s, !!startsLine);
          return forward(2);
        }
        if (inImplicitObject() && indexOf.call(LINEBREAKS, tag) >= 0) {
          stackTop()[2].sameLine = false;
        }
        newLine = prevTag === 'OUTDENT' || prevToken.newLine;
        if (indexOf.call(IMPLICIT_END, tag) >= 0 || indexOf.call(CALL_CLOSERS, tag) >= 0 && newLine) {
          while (inImplicit()) {
            ref4 = stackTop(), stackTag = ref4[0], stackIdx = ref4[1], (ref5 = ref4[2], sameLine = ref5.sameLine, startsLine = ref5.startsLine);
            if (inImplicitCall() && prevTag !== ',') {
              endImplicitCall();
            } else if (inImplicitObject() && !this.insideForDeclaration && sameLine && tag !== 'TERMINATOR' && prevTag !== ':') {
              endImplicitObject();
            } else if (inImplicitObject() && tag === 'TERMINATOR' && prevTag !== ',' && !(startsLine && this.looksObjectish(i + 1))) {
              if (nextTag === 'HERECOMMENT') {
                return forward(1);
              }
              endImplicitObject();
            } else {
              break;
            }
          }
        }
        if (tag === ',' && !this.looksObjectish(i + 1) && inImplicitObject() && !this.insideForDeclaration && (nextTag !== 'TERMINATOR' || !this.looksObjectish(i + 2))) {
          offset = nextTag === 'OUTDENT' ? 1 : 0;
          while (inImplicitObject()) {
            endImplicitObject(i + offset);
          }
        }
        return forward(1);
      });
    };

    Rewriter.prototype.addLocationDataToGeneratedTokens = function() {
      return this.scanTokens(function(token, i, tokens) {
        var column, line, nextLocation, prevLocation, ref, ref1;
        if (token[2]) {
          return 1;
        }
        if (!(token.generated || token.explicit)) {
          return 1;
        }
        if (token[0] === '{' && (nextLocation = (ref = tokens[i + 1]) != null ? ref[2] : void 0)) {
          line = nextLocation.first_line, column = nextLocation.first_column;
        } else if (prevLocation = (ref1 = tokens[i - 1]) != null ? ref1[2] : void 0) {
          line = prevLocation.last_line, column = prevLocation.last_column;
        } else {
          line = column = 0;
        }
        token[2] = {
          first_line: line,
          first_column: column,
          last_line: line,
          last_column: column
        };
        return 1;
      });
    };

    Rewriter.prototype.fixOutdentLocationData = function() {
      return this.scanTokens(function(token, i, tokens) {
        var prevLocationData;
        if (!(token[0] === 'OUTDENT' || (token.generated && token[0] === 'CALL_END') || (token.generated && token[0] === '}'))) {
          return 1;
        }
        prevLocationData = tokens[i - 1][2];
        token[2] = {
          first_line: prevLocationData.last_line,
          first_column: prevLocationData.last_column,
          last_line: prevLocationData.last_line,
          last_column: prevLocationData.last_column
        };
        return 1;
      });
    };

    Rewriter.prototype.normalizeLines = function() {
      var action, condition, indent, outdent, starter;
      starter = indent = outdent = null;
      condition = function(token, i) {
        var ref, ref1, ref2, ref3;
        return token[1] !== ';' && (ref = token[0], indexOf.call(SINGLE_CLOSERS, ref) >= 0) && !(token[0] === 'TERMINATOR' && (ref1 = this.tag(i + 1), indexOf.call(EXPRESSION_CLOSE, ref1) >= 0)) && !(token[0] === 'ELSE' && starter !== 'THEN') && !(((ref2 = token[0]) === 'CATCH' || ref2 === 'FINALLY') && (starter === '->' || starter === '=>')) || (ref3 = token[0], indexOf.call(CALL_CLOSERS, ref3) >= 0) && this.tokens[i - 1].newLine;
      };
      action = function(token, i) {
        return this.tokens.splice((this.tag(i - 1) === ',' ? i - 1 : i), 0, outdent);
      };
      return this.scanTokens(function(token, i, tokens) {
        var j, k, ref, ref1, ref2, tag;
        tag = token[0];
        if (tag === 'TERMINATOR') {
          if (this.tag(i + 1) === 'ELSE' && this.tag(i - 1) !== 'OUTDENT') {
            tokens.splice.apply(tokens, [i, 1].concat(slice.call(this.indentation())));
            return 1;
          }
          if (ref = this.tag(i + 1), indexOf.call(EXPRESSION_CLOSE, ref) >= 0) {
            tokens.splice(i, 1);
            return 0;
          }
        }
        if (tag === 'CATCH') {
          for (j = k = 1; k <= 2; j = ++k) {
            if (!((ref1 = this.tag(i + j)) === 'OUTDENT' || ref1 === 'TERMINATOR' || ref1 === 'FINALLY')) {
              continue;
            }
            tokens.splice.apply(tokens, [i + j, 0].concat(slice.call(this.indentation())));
            return 2 + j;
          }
        }
        if (indexOf.call(SINGLE_LINERS, tag) >= 0 && this.tag(i + 1) !== 'INDENT' && !(tag === 'ELSE' && this.tag(i + 1) === 'IF')) {
          starter = tag;
          ref2 = this.indentation(tokens[i]), indent = ref2[0], outdent = ref2[1];
          if (starter === 'THEN') {
            indent.fromThen = true;
          }
          tokens.splice(i + 1, 0, indent);
          this.detectEnd(i + 2, condition, action);
          if (tag === 'THEN') {
            tokens.splice(i, 1);
          }
          return 1;
        }
        return 1;
      });
    };

    Rewriter.prototype.tagPostfixConditionals = function() {
      var action, condition, original;
      original = null;
      condition = function(token, i) {
        var prevTag, tag;
        tag = token[0];
        prevTag = this.tokens[i - 1][0];
        return tag === 'TERMINATOR' || (tag === 'INDENT' && indexOf.call(SINGLE_LINERS, prevTag) < 0);
      };
      action = function(token, i) {
        if (token[0] !== 'INDENT' || (token.generated && !token.fromThen)) {
          return original[0] = 'POST_' + original[0];
        }
      };
      return this.scanTokens(function(token, i) {
        if (token[0] !== 'IF') {
          return 1;
        }
        original = token;
        this.detectEnd(i + 1, condition, action);
        return 1;
      });
    };

    Rewriter.prototype.indentation = function(origin) {
      var indent, outdent;
      indent = ['INDENT', 2];
      outdent = ['OUTDENT', 2];
      if (origin) {
        indent.generated = outdent.generated = true;
        indent.origin = outdent.origin = origin;
      } else {
        indent.explicit = outdent.explicit = true;
      }
      return [indent, outdent];
    };

    Rewriter.prototype.generate = generate;

    Rewriter.prototype.tag = function(i) {
      var ref;
      return (ref = this.tokens[i]) != null ? ref[0] : void 0;
    };

    return Rewriter;

  })();

  BALANCED_PAIRS = [['(', ')'], ['[', ']'], ['{', '}'], ['INDENT', 'OUTDENT'], ['CALL_START', 'CALL_END'], ['PARAM_START', 'PARAM_END'], ['INDEX_START', 'INDEX_END'], ['STRING_START', 'STRING_END'], ['REGEX_START', 'REGEX_END']];

  exports.INVERSES = INVERSES = {};

  EXPRESSION_START = [];

  EXPRESSION_END = [];

  for (k = 0, len = BALANCED_PAIRS.length; k < len; k++) {
    ref = BALANCED_PAIRS[k], left = ref[0], rite = ref[1];
    EXPRESSION_START.push(INVERSES[rite] = left);
    EXPRESSION_END.push(INVERSES[left] = rite);
  }

  EXPRESSION_CLOSE = ['CATCH', 'THEN', 'ELSE', 'FINALLY'].concat(EXPRESSION_END);

  IMPLICIT_FUNC = ['IDENTIFIER', 'PROPERTY', 'SUPER', ')', 'CALL_END', ']', 'INDEX_END', '@', 'THIS'];

  IMPLICIT_CALL = ['IDENTIFIER', 'PROPERTY', 'NUMBER', 'INFINITY', 'NAN', 'STRING', 'STRING_START', 'REGEX', 'REGEX_START', 'JS', 'NEW', 'PARAM_START', 'CLASS', 'IF', 'TRY', 'SWITCH', 'THIS', 'UNDEFINED', 'NULL', 'BOOL', 'UNARY', 'YIELD', 'UNARY_MATH', 'SUPER', 'THROW', '@', '->', '=>', '[', '(', '{', '--', '++'];

  IMPLICIT_UNSPACED_CALL = ['+', '-'];

  IMPLICIT_END = ['POST_IF', 'FOR', 'WHILE', 'UNTIL', 'WHEN', 'BY', 'LOOP', 'TERMINATOR'];

  SINGLE_LINERS = ['ELSE', '->', '=>', 'TRY', 'FINALLY', 'THEN'];

  SINGLE_CLOSERS = ['TERMINATOR', 'CATCH', 'FINALLY', 'ELSE', 'OUTDENT', 'LEADING_WHEN'];

  LINEBREAKS = ['TERMINATOR', 'INDENT', 'OUTDENT'];

  CALL_CLOSERS = ['.', '?.', '::', '?::'];

}).call(this);

},{}],22:[function(require,module,exports){
// Generated by CoffeeScript 1.12.2
(function() {
  var Scope,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  exports.Scope = Scope = (function() {
    function Scope(parent, expressions, method, referencedVars) {
      var ref, ref1;
      this.parent = parent;
      this.expressions = expressions;
      this.method = method;
      this.referencedVars = referencedVars;
      this.variables = [
        {
          name: 'arguments',
          type: 'arguments'
        }
      ];
      this.positions = {};
      if (!this.parent) {
        this.utilities = {};
      }
      this.root = (ref = (ref1 = this.parent) != null ? ref1.root : void 0) != null ? ref : this;
    }

    Scope.prototype.add = function(name, type, immediate) {
      if (this.shared && !immediate) {
        return this.parent.add(name, type, immediate);
      }
      if (Object.prototype.hasOwnProperty.call(this.positions, name)) {
        return this.variables[this.positions[name]].type = type;
      } else {
        return this.positions[name] = this.variables.push({
          name: name,
          type: type
        }) - 1;
      }
    };

    Scope.prototype.namedMethod = function() {
      var ref;
      if (((ref = this.method) != null ? ref.name : void 0) || !this.parent) {
        return this.method;
      }
      return this.parent.namedMethod();
    };

    Scope.prototype.find = function(name) {
      if (this.check(name)) {
        return true;
      }
      this.add(name, 'var');
      return false;
    };

    Scope.prototype.parameter = function(name) {
      if (this.shared && this.parent.check(name, true)) {
        return;
      }
      return this.add(name, 'param');
    };

    Scope.prototype.check = function(name) {
      var ref;
      return !!(this.type(name) || ((ref = this.parent) != null ? ref.check(name) : void 0));
    };

    Scope.prototype.temporary = function(name, index, single) {
      var diff, endCode, letter, newCode, num, startCode;
      if (single == null) {
        single = false;
      }
      if (single) {
        startCode = name.charCodeAt(0);
        endCode = 'z'.charCodeAt(0);
        diff = endCode - startCode;
        newCode = startCode + index % (diff + 1);
        letter = String.fromCharCode(newCode);
        num = Math.floor(index / (diff + 1));
        return "" + letter + (num || '');
      } else {
        return "" + name + (index || '');
      }
    };

    Scope.prototype.type = function(name) {
      var i, len, ref, v;
      ref = this.variables;
      for (i = 0, len = ref.length; i < len; i++) {
        v = ref[i];
        if (v.name === name) {
          return v.type;
        }
      }
      return null;
    };

    Scope.prototype.freeVariable = function(name, options) {
      var index, ref, temp;
      if (options == null) {
        options = {};
      }
      index = 0;
      while (true) {
        temp = this.temporary(name, index, options.single);
        if (!(this.check(temp) || indexOf.call(this.root.referencedVars, temp) >= 0)) {
          break;
        }
        index++;
      }
      if ((ref = options.reserve) != null ? ref : true) {
        this.add(temp, 'var', true);
      }
      return temp;
    };

    Scope.prototype.assign = function(name, value) {
      this.add(name, {
        value: value,
        assigned: true
      }, true);
      return this.hasAssignments = true;
    };

    Scope.prototype.hasDeclarations = function() {
      return !!this.declaredVariables().length;
    };

    Scope.prototype.declaredVariables = function() {
      var v;
      return ((function() {
        var i, len, ref, results;
        ref = this.variables;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          v = ref[i];
          if (v.type === 'var') {
            results.push(v.name);
          }
        }
        return results;
      }).call(this)).sort();
    };

    Scope.prototype.assignedVariables = function() {
      var i, len, ref, results, v;
      ref = this.variables;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        v = ref[i];
        if (v.type.assigned) {
          results.push(v.name + " = " + v.type.value);
        }
      }
      return results;
    };

    return Scope;

  })();

}).call(this);

},{}],23:[function(require,module,exports){
// Generated by CoffeeScript 1.12.2
(function() {
  var LineMap, SourceMap;

  LineMap = (function() {
    function LineMap(line1) {
      this.line = line1;
      this.columns = [];
    }

    LineMap.prototype.add = function(column, arg, options) {
      var sourceColumn, sourceLine;
      sourceLine = arg[0], sourceColumn = arg[1];
      if (options == null) {
        options = {};
      }
      if (this.columns[column] && options.noReplace) {
        return;
      }
      return this.columns[column] = {
        line: this.line,
        column: column,
        sourceLine: sourceLine,
        sourceColumn: sourceColumn
      };
    };

    LineMap.prototype.sourceLocation = function(column) {
      var mapping;
      while (!((mapping = this.columns[column]) || (column <= 0))) {
        column--;
      }
      return mapping && [mapping.sourceLine, mapping.sourceColumn];
    };

    return LineMap;

  })();

  SourceMap = (function() {
    var BASE64_CHARS, VLQ_CONTINUATION_BIT, VLQ_SHIFT, VLQ_VALUE_MASK;

    function SourceMap() {
      this.lines = [];
    }

    SourceMap.prototype.add = function(sourceLocation, generatedLocation, options) {
      var base, column, line, lineMap;
      if (options == null) {
        options = {};
      }
      line = generatedLocation[0], column = generatedLocation[1];
      lineMap = ((base = this.lines)[line] || (base[line] = new LineMap(line)));
      return lineMap.add(column, sourceLocation, options);
    };

    SourceMap.prototype.sourceLocation = function(arg) {
      var column, line, lineMap;
      line = arg[0], column = arg[1];
      while (!((lineMap = this.lines[line]) || (line <= 0))) {
        line--;
      }
      return lineMap && lineMap.sourceLocation(column);
    };

    SourceMap.prototype.generate = function(options, code) {
      var buffer, i, j, lastColumn, lastSourceColumn, lastSourceLine, len, len1, lineMap, lineNumber, mapping, needComma, ref, ref1, v3, writingline;
      if (options == null) {
        options = {};
      }
      if (code == null) {
        code = null;
      }
      writingline = 0;
      lastColumn = 0;
      lastSourceLine = 0;
      lastSourceColumn = 0;
      needComma = false;
      buffer = "";
      ref = this.lines;
      for (lineNumber = i = 0, len = ref.length; i < len; lineNumber = ++i) {
        lineMap = ref[lineNumber];
        if (lineMap) {
          ref1 = lineMap.columns;
          for (j = 0, len1 = ref1.length; j < len1; j++) {
            mapping = ref1[j];
            if (!(mapping)) {
              continue;
            }
            while (writingline < mapping.line) {
              lastColumn = 0;
              needComma = false;
              buffer += ";";
              writingline++;
            }
            if (needComma) {
              buffer += ",";
              needComma = false;
            }
            buffer += this.encodeVlq(mapping.column - lastColumn);
            lastColumn = mapping.column;
            buffer += this.encodeVlq(0);
            buffer += this.encodeVlq(mapping.sourceLine - lastSourceLine);
            lastSourceLine = mapping.sourceLine;
            buffer += this.encodeVlq(mapping.sourceColumn - lastSourceColumn);
            lastSourceColumn = mapping.sourceColumn;
            needComma = true;
          }
        }
      }
      v3 = {
        version: 3,
        file: options.generatedFile || '',
        sourceRoot: options.sourceRoot || '',
        sources: options.sourceFiles || [''],
        names: [],
        mappings: buffer
      };
      if (options.inlineMap) {
        v3.sourcesContent = [code];
      }
      return v3;
    };

    VLQ_SHIFT = 5;

    VLQ_CONTINUATION_BIT = 1 << VLQ_SHIFT;

    VLQ_VALUE_MASK = VLQ_CONTINUATION_BIT - 1;

    SourceMap.prototype.encodeVlq = function(value) {
      var answer, nextChunk, signBit, valueToEncode;
      answer = '';
      signBit = value < 0 ? 1 : 0;
      valueToEncode = (Math.abs(value) << 1) + signBit;
      while (valueToEncode || !answer) {
        nextChunk = valueToEncode & VLQ_VALUE_MASK;
        valueToEncode = valueToEncode >> VLQ_SHIFT;
        if (valueToEncode) {
          nextChunk |= VLQ_CONTINUATION_BIT;
        }
        answer += this.encodeBase64(nextChunk);
      }
      return answer;
    };

    BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    SourceMap.prototype.encodeBase64 = function(value) {
      return BASE64_CHARS[value] || (function() {
        throw new Error("Cannot Base64 encode value: " + value);
      })();
    };

    return SourceMap;

  })();

  module.exports = SourceMap;

}).call(this);

},{}],24:[function(require,module,exports){
module.exports={
  "_args": [
    [
      {
        "raw": "coffee-script",
        "scope": null,
        "escapedName": "coffee-script",
        "name": "coffee-script",
        "rawSpec": "",
        "spec": "latest",
        "type": "tag"
      },
      "/Users/james/Desktop/Kano/terminal-art"
    ]
  ],
  "_from": "coffee-script@latest",
  "_id": "coffee-script@1.12.2",
  "_inCache": true,
  "_location": "/coffee-script",
  "_nodeVersion": "7.2.0",
  "_npmOperationalInternal": {
    "host": "packages-12-west.internal.npmjs.com",
    "tmp": "tmp/coffee-script-1.12.2.tgz_1481878079602_0.06988411536440253"
  },
  "_npmUser": {
    "name": "lydell",
    "email": "simon.lydell@gmail.com"
  },
  "_npmVersion": "3.10.9",
  "_phantomChildren": {},
  "_requested": {
    "raw": "coffee-script",
    "scope": null,
    "escapedName": "coffee-script",
    "name": "coffee-script",
    "rawSpec": "",
    "spec": "latest",
    "type": "tag"
  },
  "_requiredBy": [
    "#USER"
  ],
  "_resolved": "https://registry.npmjs.org/coffee-script/-/coffee-script-1.12.2.tgz",
  "_shasum": "0d4cbdee183f650da95419570c4929d08ef91376",
  "_shrinkwrap": null,
  "_spec": "coffee-script",
  "_where": "/Users/james/Desktop/Kano/terminal-art",
  "author": {
    "name": "Jeremy Ashkenas"
  },
  "bin": {
    "coffee": "./bin/coffee",
    "cake": "./bin/cake"
  },
  "bugs": {
    "url": "https://github.com/jashkenas/coffeescript/issues"
  },
  "dependencies": {},
  "description": "Unfancy JavaScript",
  "devDependencies": {
    "docco": "~0.7.0",
    "google-closure-compiler-js": "^20161201.0.0",
    "highlight.js": "~9.9.0",
    "jison": ">=0.4.17",
    "marked": "^0.3.6",
    "underscore": "~1.8.3"
  },
  "directories": {
    "lib": "./lib/coffee-script"
  },
  "dist": {
    "shasum": "0d4cbdee183f650da95419570c4929d08ef91376",
    "tarball": "https://registry.npmjs.org/coffee-script/-/coffee-script-1.12.2.tgz"
  },
  "engines": {
    "node": ">=0.8.0"
  },
  "files": [
    "bin",
    "lib",
    "register.js",
    "repl.js"
  ],
  "gitHead": "de180dc81ab138127bdf40ed775a10f8cf870e85",
  "homepage": "http://coffeescript.org",
  "keywords": [
    "javascript",
    "language",
    "coffeescript",
    "compiler"
  ],
  "license": "MIT",
  "main": "./lib/coffee-script/coffee-script",
  "maintainers": [
    {
      "name": "jashkenas",
      "email": "jashkenas@gmail.com"
    },
    {
      "name": "lydell",
      "email": "simon.lydell@gmail.com"
    },
    {
      "name": "michaelficarra",
      "email": "npm@michael.ficarra.me"
    }
  ],
  "name": "coffee-script",
  "optionalDependencies": {},
  "preferGlobal": true,
  "readme": "ERROR: No README data found!",
  "repository": {
    "type": "git",
    "url": "git://github.com/jashkenas/coffeescript.git"
  },
  "scripts": {
    "test": "node ./bin/cake test",
    "test-harmony": "node --harmony ./bin/cake test"
  },
  "version": "1.12.2"
}

},{}],25:[function(require,module,exports){
require('./lib/coffee-script/register');

},{"./lib/coffee-script/register":20}],26:[function(require,module,exports){
/* MIT license */
var cssKeywords = require('color-name');

// NOTE: conversions should only return primitive values (i.e. arrays, or
//       values that give correct `typeof` results).
//       do not use box values types (i.e. Number(), String(), etc.)

var reverseKeywords = {};
for (var key in cssKeywords) {
	if (cssKeywords.hasOwnProperty(key)) {
		reverseKeywords[cssKeywords[key]] = key;
	}
}

var convert = module.exports = {
	rgb: {channels: 3, labels: 'rgb'},
	hsl: {channels: 3, labels: 'hsl'},
	hsv: {channels: 3, labels: 'hsv'},
	hwb: {channels: 3, labels: 'hwb'},
	cmyk: {channels: 4, labels: 'cmyk'},
	xyz: {channels: 3, labels: 'xyz'},
	lab: {channels: 3, labels: 'lab'},
	lch: {channels: 3, labels: 'lch'},
	hex: {channels: 1, labels: ['hex']},
	keyword: {channels: 1, labels: ['keyword']},
	ansi16: {channels: 1, labels: ['ansi16']},
	ansi256: {channels: 1, labels: ['ansi256']},
	hcg: {channels: 3, labels: ['h', 'c', 'g']},
	apple: {channels: 3, labels: ['r16', 'g16', 'b16']},
	gray: {channels: 1, labels: ['gray']}
};

// hide .channels and .labels properties
for (var model in convert) {
	if (convert.hasOwnProperty(model)) {
		if (!('channels' in convert[model])) {
			throw new Error('missing channels property: ' + model);
		}

		if (!('labels' in convert[model])) {
			throw new Error('missing channel labels property: ' + model);
		}

		if (convert[model].labels.length !== convert[model].channels) {
			throw new Error('channel and label counts mismatch: ' + model);
		}

		var channels = convert[model].channels;
		var labels = convert[model].labels;
		delete convert[model].channels;
		delete convert[model].labels;
		Object.defineProperty(convert[model], 'channels', {value: channels});
		Object.defineProperty(convert[model], 'labels', {value: labels});
	}
}

convert.rgb.hsl = function (rgb) {
	var r = rgb[0] / 255;
	var g = rgb[1] / 255;
	var b = rgb[2] / 255;
	var min = Math.min(r, g, b);
	var max = Math.max(r, g, b);
	var delta = max - min;
	var h;
	var s;
	var l;

	if (max === min) {
		h = 0;
	} else if (r === max) {
		h = (g - b) / delta;
	} else if (g === max) {
		h = 2 + (b - r) / delta;
	} else if (b === max) {
		h = 4 + (r - g) / delta;
	}

	h = Math.min(h * 60, 360);

	if (h < 0) {
		h += 360;
	}

	l = (min + max) / 2;

	if (max === min) {
		s = 0;
	} else if (l <= 0.5) {
		s = delta / (max + min);
	} else {
		s = delta / (2 - max - min);
	}

	return [h, s * 100, l * 100];
};

convert.rgb.hsv = function (rgb) {
	var r = rgb[0];
	var g = rgb[1];
	var b = rgb[2];
	var min = Math.min(r, g, b);
	var max = Math.max(r, g, b);
	var delta = max - min;
	var h;
	var s;
	var v;

	if (max === 0) {
		s = 0;
	} else {
		s = (delta / max * 1000) / 10;
	}

	if (max === min) {
		h = 0;
	} else if (r === max) {
		h = (g - b) / delta;
	} else if (g === max) {
		h = 2 + (b - r) / delta;
	} else if (b === max) {
		h = 4 + (r - g) / delta;
	}

	h = Math.min(h * 60, 360);

	if (h < 0) {
		h += 360;
	}

	v = ((max / 255) * 1000) / 10;

	return [h, s, v];
};

convert.rgb.hwb = function (rgb) {
	var r = rgb[0];
	var g = rgb[1];
	var b = rgb[2];
	var h = convert.rgb.hsl(rgb)[0];
	var w = 1 / 255 * Math.min(r, Math.min(g, b));

	b = 1 - 1 / 255 * Math.max(r, Math.max(g, b));

	return [h, w * 100, b * 100];
};

convert.rgb.cmyk = function (rgb) {
	var r = rgb[0] / 255;
	var g = rgb[1] / 255;
	var b = rgb[2] / 255;
	var c;
	var m;
	var y;
	var k;

	k = Math.min(1 - r, 1 - g, 1 - b);
	c = (1 - r - k) / (1 - k) || 0;
	m = (1 - g - k) / (1 - k) || 0;
	y = (1 - b - k) / (1 - k) || 0;

	return [c * 100, m * 100, y * 100, k * 100];
};

/**
 * See https://en.m.wikipedia.org/wiki/Euclidean_distance#Squared_Euclidean_distance
 * */
function comparativeDistance(x, y) {
	return (
		Math.pow(x[0] - y[0], 2) +
		Math.pow(x[1] - y[1], 2) +
		Math.pow(x[2] - y[2], 2)
	);
}

convert.rgb.keyword = function (rgb) {
	var reversed = reverseKeywords[rgb];
	if (reversed) {
		return reversed;
	}

	var currentClosestDistance = Infinity;
	var currentClosestKeyword;

	for (var keyword in cssKeywords) {
		if (cssKeywords.hasOwnProperty(keyword)) {
			var value = cssKeywords[keyword];

			// Compute comparative distance
			var distance = comparativeDistance(rgb, value);

			// Check if its less, if so set as closest
			if (distance < currentClosestDistance) {
				currentClosestDistance = distance;
				currentClosestKeyword = keyword;
			}
		}
	}

	return currentClosestKeyword;
};

convert.keyword.rgb = function (keyword) {
	return cssKeywords[keyword];
};

convert.rgb.xyz = function (rgb) {
	var r = rgb[0] / 255;
	var g = rgb[1] / 255;
	var b = rgb[2] / 255;

	// assume sRGB
	r = r > 0.04045 ? Math.pow(((r + 0.055) / 1.055), 2.4) : (r / 12.92);
	g = g > 0.04045 ? Math.pow(((g + 0.055) / 1.055), 2.4) : (g / 12.92);
	b = b > 0.04045 ? Math.pow(((b + 0.055) / 1.055), 2.4) : (b / 12.92);

	var x = (r * 0.4124) + (g * 0.3576) + (b * 0.1805);
	var y = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
	var z = (r * 0.0193) + (g * 0.1192) + (b * 0.9505);

	return [x * 100, y * 100, z * 100];
};

convert.rgb.lab = function (rgb) {
	var xyz = convert.rgb.xyz(rgb);
	var x = xyz[0];
	var y = xyz[1];
	var z = xyz[2];
	var l;
	var a;
	var b;

	x /= 95.047;
	y /= 100;
	z /= 108.883;

	x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + (16 / 116);
	y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + (16 / 116);
	z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + (16 / 116);

	l = (116 * y) - 16;
	a = 500 * (x - y);
	b = 200 * (y - z);

	return [l, a, b];
};

convert.hsl.rgb = function (hsl) {
	var h = hsl[0] / 360;
	var s = hsl[1] / 100;
	var l = hsl[2] / 100;
	var t1;
	var t2;
	var t3;
	var rgb;
	var val;

	if (s === 0) {
		val = l * 255;
		return [val, val, val];
	}

	if (l < 0.5) {
		t2 = l * (1 + s);
	} else {
		t2 = l + s - l * s;
	}

	t1 = 2 * l - t2;

	rgb = [0, 0, 0];
	for (var i = 0; i < 3; i++) {
		t3 = h + 1 / 3 * -(i - 1);
		if (t3 < 0) {
			t3++;
		}
		if (t3 > 1) {
			t3--;
		}

		if (6 * t3 < 1) {
			val = t1 + (t2 - t1) * 6 * t3;
		} else if (2 * t3 < 1) {
			val = t2;
		} else if (3 * t3 < 2) {
			val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
		} else {
			val = t1;
		}

		rgb[i] = val * 255;
	}

	return rgb;
};

convert.hsl.hsv = function (hsl) {
	var h = hsl[0];
	var s = hsl[1] / 100;
	var l = hsl[2] / 100;
	var smin = s;
	var lmin = Math.max(l, 0.01);
	var sv;
	var v;

	l *= 2;
	s *= (l <= 1) ? l : 2 - l;
	smin *= lmin <= 1 ? lmin : 2 - lmin;
	v = (l + s) / 2;
	sv = l === 0 ? (2 * smin) / (lmin + smin) : (2 * s) / (l + s);

	return [h, sv * 100, v * 100];
};

convert.hsv.rgb = function (hsv) {
	var h = hsv[0] / 60;
	var s = hsv[1] / 100;
	var v = hsv[2] / 100;
	var hi = Math.floor(h) % 6;

	var f = h - Math.floor(h);
	var p = 255 * v * (1 - s);
	var q = 255 * v * (1 - (s * f));
	var t = 255 * v * (1 - (s * (1 - f)));
	v *= 255;

	switch (hi) {
		case 0:
			return [v, t, p];
		case 1:
			return [q, v, p];
		case 2:
			return [p, v, t];
		case 3:
			return [p, q, v];
		case 4:
			return [t, p, v];
		case 5:
			return [v, p, q];
	}
};

convert.hsv.hsl = function (hsv) {
	var h = hsv[0];
	var s = hsv[1] / 100;
	var v = hsv[2] / 100;
	var vmin = Math.max(v, 0.01);
	var lmin;
	var sl;
	var l;

	l = (2 - s) * v;
	lmin = (2 - s) * vmin;
	sl = s * vmin;
	sl /= (lmin <= 1) ? lmin : 2 - lmin;
	sl = sl || 0;
	l /= 2;

	return [h, sl * 100, l * 100];
};

// http://dev.w3.org/csswg/css-color/#hwb-to-rgb
convert.hwb.rgb = function (hwb) {
	var h = hwb[0] / 360;
	var wh = hwb[1] / 100;
	var bl = hwb[2] / 100;
	var ratio = wh + bl;
	var i;
	var v;
	var f;
	var n;

	// wh + bl cant be > 1
	if (ratio > 1) {
		wh /= ratio;
		bl /= ratio;
	}

	i = Math.floor(6 * h);
	v = 1 - bl;
	f = 6 * h - i;

	if ((i & 0x01) !== 0) {
		f = 1 - f;
	}

	n = wh + f * (v - wh); // linear interpolation

	var r;
	var g;
	var b;
	switch (i) {
		default:
		case 6:
		case 0: r = v; g = n; b = wh; break;
		case 1: r = n; g = v; b = wh; break;
		case 2: r = wh; g = v; b = n; break;
		case 3: r = wh; g = n; b = v; break;
		case 4: r = n; g = wh; b = v; break;
		case 5: r = v; g = wh; b = n; break;
	}

	return [r * 255, g * 255, b * 255];
};

convert.cmyk.rgb = function (cmyk) {
	var c = cmyk[0] / 100;
	var m = cmyk[1] / 100;
	var y = cmyk[2] / 100;
	var k = cmyk[3] / 100;
	var r;
	var g;
	var b;

	r = 1 - Math.min(1, c * (1 - k) + k);
	g = 1 - Math.min(1, m * (1 - k) + k);
	b = 1 - Math.min(1, y * (1 - k) + k);

	return [r * 255, g * 255, b * 255];
};

convert.xyz.rgb = function (xyz) {
	var x = xyz[0] / 100;
	var y = xyz[1] / 100;
	var z = xyz[2] / 100;
	var r;
	var g;
	var b;

	r = (x * 3.2406) + (y * -1.5372) + (z * -0.4986);
	g = (x * -0.9689) + (y * 1.8758) + (z * 0.0415);
	b = (x * 0.0557) + (y * -0.2040) + (z * 1.0570);

	// assume sRGB
	r = r > 0.0031308
		? ((1.055 * Math.pow(r, 1.0 / 2.4)) - 0.055)
		: r * 12.92;

	g = g > 0.0031308
		? ((1.055 * Math.pow(g, 1.0 / 2.4)) - 0.055)
		: g * 12.92;

	b = b > 0.0031308
		? ((1.055 * Math.pow(b, 1.0 / 2.4)) - 0.055)
		: b * 12.92;

	r = Math.min(Math.max(0, r), 1);
	g = Math.min(Math.max(0, g), 1);
	b = Math.min(Math.max(0, b), 1);

	return [r * 255, g * 255, b * 255];
};

convert.xyz.lab = function (xyz) {
	var x = xyz[0];
	var y = xyz[1];
	var z = xyz[2];
	var l;
	var a;
	var b;

	x /= 95.047;
	y /= 100;
	z /= 108.883;

	x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + (16 / 116);
	y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + (16 / 116);
	z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + (16 / 116);

	l = (116 * y) - 16;
	a = 500 * (x - y);
	b = 200 * (y - z);

	return [l, a, b];
};

convert.lab.xyz = function (lab) {
	var l = lab[0];
	var a = lab[1];
	var b = lab[2];
	var x;
	var y;
	var z;

	y = (l + 16) / 116;
	x = a / 500 + y;
	z = y - b / 200;

	var y2 = Math.pow(y, 3);
	var x2 = Math.pow(x, 3);
	var z2 = Math.pow(z, 3);
	y = y2 > 0.008856 ? y2 : (y - 16 / 116) / 7.787;
	x = x2 > 0.008856 ? x2 : (x - 16 / 116) / 7.787;
	z = z2 > 0.008856 ? z2 : (z - 16 / 116) / 7.787;

	x *= 95.047;
	y *= 100;
	z *= 108.883;

	return [x, y, z];
};

convert.lab.lch = function (lab) {
	var l = lab[0];
	var a = lab[1];
	var b = lab[2];
	var hr;
	var h;
	var c;

	hr = Math.atan2(b, a);
	h = hr * 360 / 2 / Math.PI;

	if (h < 0) {
		h += 360;
	}

	c = Math.sqrt(a * a + b * b);

	return [l, c, h];
};

convert.lch.lab = function (lch) {
	var l = lch[0];
	var c = lch[1];
	var h = lch[2];
	var a;
	var b;
	var hr;

	hr = h / 360 * 2 * Math.PI;
	a = c * Math.cos(hr);
	b = c * Math.sin(hr);

	return [l, a, b];
};

convert.rgb.ansi16 = function (args) {
	var r = args[0];
	var g = args[1];
	var b = args[2];
	var value = 1 in arguments ? arguments[1] : convert.rgb.hsv(args)[2]; // hsv -> ansi16 optimization

	value = Math.round(value / 50);

	if (value === 0) {
		return 30;
	}

	var ansi = 30
		+ ((Math.round(b / 255) << 2)
		| (Math.round(g / 255) << 1)
		| Math.round(r / 255));

	if (value === 2) {
		ansi += 60;
	}

	return ansi;
};

convert.hsv.ansi16 = function (args) {
	// optimization here; we already know the value and don't need to get
	// it converted for us.
	return convert.rgb.ansi16(convert.hsv.rgb(args), args[2]);
};

convert.rgb.ansi256 = function (args) {
	var r = args[0];
	var g = args[1];
	var b = args[2];

	// we use the extended greyscale palette here, with the exception of
	// black and white. normal palette only has 4 greyscale shades.
	if (r === g && g === b) {
		if (r < 8) {
			return 16;
		}

		if (r > 248) {
			return 231;
		}

		return Math.round(((r - 8) / 247) * 24) + 232;
	}

	var ansi = 16
		+ (36 * Math.round(r / 255 * 5))
		+ (6 * Math.round(g / 255 * 5))
		+ Math.round(b / 255 * 5);

	return ansi;
};

convert.ansi16.rgb = function (args) {
	var color = args % 10;

	// handle greyscale
	if (color === 0 || color === 7) {
		if (args > 50) {
			color += 3.5;
		}

		color = color / 10.5 * 255;

		return [color, color, color];
	}

	var mult = (~~(args > 50) + 1) * 0.5;
	var r = ((color & 1) * mult) * 255;
	var g = (((color >> 1) & 1) * mult) * 255;
	var b = (((color >> 2) & 1) * mult) * 255;

	return [r, g, b];
};

convert.ansi256.rgb = function (args) {
	// handle greyscale
	if (args >= 232) {
		var c = (args - 232) * 10 + 8;
		return [c, c, c];
	}

	args -= 16;

	var rem;
	var r = Math.floor(args / 36) / 5 * 255;
	var g = Math.floor((rem = args % 36) / 6) / 5 * 255;
	var b = (rem % 6) / 5 * 255;

	return [r, g, b];
};

convert.rgb.hex = function (args) {
	var integer = ((Math.round(args[0]) & 0xFF) << 16)
		+ ((Math.round(args[1]) & 0xFF) << 8)
		+ (Math.round(args[2]) & 0xFF);

	var string = integer.toString(16).toUpperCase();
	return '000000'.substring(string.length) + string;
};

convert.hex.rgb = function (args) {
	var match = args.toString(16).match(/[a-f0-9]{6}/i);
	if (!match) {
		return [0, 0, 0];
	}

	var integer = parseInt(match[0], 16);
	var r = (integer >> 16) & 0xFF;
	var g = (integer >> 8) & 0xFF;
	var b = integer & 0xFF;

	return [r, g, b];
};

convert.rgb.hcg = function (rgb) {
	var r = rgb[0] / 255;
	var g = rgb[1] / 255;
	var b = rgb[2] / 255;
	var max = Math.max(Math.max(r, g), b);
	var min = Math.min(Math.min(r, g), b);
	var chroma = (max - min);
	var grayscale;
	var hue;

	if (chroma < 1) {
		grayscale = min / (1 - chroma);
	} else {
		grayscale = 0;
	}

	if (chroma <= 0) {
		hue = 0;
	} else
	if (max === r) {
		hue = ((g - b) / chroma) % 6;
	} else
	if (max === g) {
		hue = 2 + (b - r) / chroma;
	} else {
		hue = 4 + (r - g) / chroma + 4;
	}

	hue /= 6;
	hue %= 1;

	return [hue * 360, chroma * 100, grayscale * 100];
};

convert.hsl.hcg = function (hsl) {
	var s = hsl[1] / 100;
	var l = hsl[2] / 100;
	var c = 1;
	var f = 0;

	if (l < 0.5) {
		c = 2.0 * s * l;
	} else {
		c = 2.0 * s * (1.0 - l);
	}

	if (c < 1.0) {
		f = (l - 0.5 * c) / (1.0 - c);
	}

	return [hsl[0], c * 100, f * 100];
};

convert.hsv.hcg = function (hsv) {
	var s = hsv[1] / 100;
	var v = hsv[2] / 100;

	var c = s * v;
	var f = 0;

	if (c < 1.0) {
		f = (v - c) / (1 - c);
	}

	return [hsv[0], c * 100, f * 100];
};

convert.hcg.rgb = function (hcg) {
	var h = hcg[0] / 360;
	var c = hcg[1] / 100;
	var g = hcg[2] / 100;

	if (c === 0.0) {
		return [g * 255, g * 255, g * 255];
	}

	var pure = [0, 0, 0];
	var hi = (h % 1) * 6;
	var v = hi % 1;
	var w = 1 - v;
	var mg = 0;

	switch (Math.floor(hi)) {
		case 0:
			pure[0] = 1; pure[1] = v; pure[2] = 0; break;
		case 1:
			pure[0] = w; pure[1] = 1; pure[2] = 0; break;
		case 2:
			pure[0] = 0; pure[1] = 1; pure[2] = v; break;
		case 3:
			pure[0] = 0; pure[1] = w; pure[2] = 1; break;
		case 4:
			pure[0] = v; pure[1] = 0; pure[2] = 1; break;
		default:
			pure[0] = 1; pure[1] = 0; pure[2] = w;
	}

	mg = (1.0 - c) * g;

	return [
		(c * pure[0] + mg) * 255,
		(c * pure[1] + mg) * 255,
		(c * pure[2] + mg) * 255
	];
};

convert.hcg.hsv = function (hcg) {
	var c = hcg[1] / 100;
	var g = hcg[2] / 100;

	var v = c + g * (1.0 - c);
	var f = 0;

	if (v > 0.0) {
		f = c / v;
	}

	return [hcg[0], f * 100, v * 100];
};

convert.hcg.hsl = function (hcg) {
	var c = hcg[1] / 100;
	var g = hcg[2] / 100;

	var l = g * (1.0 - c) + 0.5 * c;
	var s = 0;

	if (l > 0.0 && l < 0.5) {
		s = c / (2 * l);
	} else
	if (l >= 0.5 && l < 1.0) {
		s = c / (2 * (1 - l));
	}

	return [hcg[0], s * 100, l * 100];
};

convert.hcg.hwb = function (hcg) {
	var c = hcg[1] / 100;
	var g = hcg[2] / 100;
	var v = c + g * (1.0 - c);
	return [hcg[0], (v - c) * 100, (1 - v) * 100];
};

convert.hwb.hcg = function (hwb) {
	var w = hwb[1] / 100;
	var b = hwb[2] / 100;
	var v = 1 - b;
	var c = v - w;
	var g = 0;

	if (c < 1) {
		g = (v - c) / (1 - c);
	}

	return [hwb[0], c * 100, g * 100];
};

convert.apple.rgb = function (apple) {
	return [(apple[0] / 65535) * 255, (apple[1] / 65535) * 255, (apple[2] / 65535) * 255];
};

convert.rgb.apple = function (rgb) {
	return [(rgb[0] / 255) * 65535, (rgb[1] / 255) * 65535, (rgb[2] / 255) * 65535];
};

convert.gray.rgb = function (args) {
	return [args[0] / 100 * 255, args[0] / 100 * 255, args[0] / 100 * 255];
};

convert.gray.hsl = convert.gray.hsv = function (args) {
	return [0, 0, args[0]];
};

convert.gray.hwb = function (gray) {
	return [0, 100, gray[0]];
};

convert.gray.cmyk = function (gray) {
	return [0, 0, 0, gray[0]];
};

convert.gray.lab = function (gray) {
	return [gray[0], 0, 0];
};

convert.gray.hex = function (gray) {
	var val = Math.round(gray[0] / 100 * 255) & 0xFF;
	var integer = (val << 16) + (val << 8) + val;

	var string = integer.toString(16).toUpperCase();
	return '000000'.substring(string.length) + string;
};

convert.rgb.gray = function (rgb) {
	var val = (rgb[0] + rgb[1] + rgb[2]) / 3;
	return [val / 255 * 100];
};

},{"color-name":29}],27:[function(require,module,exports){
var conversions = require('./conversions');
var route = require('./route');

var convert = {};

var models = Object.keys(conversions);

function wrapRaw(fn) {
	var wrappedFn = function (args) {
		if (args === undefined || args === null) {
			return args;
		}

		if (arguments.length > 1) {
			args = Array.prototype.slice.call(arguments);
		}

		return fn(args);
	};

	// preserve .conversion property if there is one
	if ('conversion' in fn) {
		wrappedFn.conversion = fn.conversion;
	}

	return wrappedFn;
}

function wrapRounded(fn) {
	var wrappedFn = function (args) {
		if (args === undefined || args === null) {
			return args;
		}

		if (arguments.length > 1) {
			args = Array.prototype.slice.call(arguments);
		}

		var result = fn(args);

		// we're assuming the result is an array here.
		// see notice in conversions.js; don't use box types
		// in conversion functions.
		if (typeof result === 'object') {
			for (var len = result.length, i = 0; i < len; i++) {
				result[i] = Math.round(result[i]);
			}
		}

		return result;
	};

	// preserve .conversion property if there is one
	if ('conversion' in fn) {
		wrappedFn.conversion = fn.conversion;
	}

	return wrappedFn;
}

models.forEach(function (fromModel) {
	convert[fromModel] = {};

	Object.defineProperty(convert[fromModel], 'channels', {value: conversions[fromModel].channels});
	Object.defineProperty(convert[fromModel], 'labels', {value: conversions[fromModel].labels});

	var routes = route(fromModel);
	var routeModels = Object.keys(routes);

	routeModels.forEach(function (toModel) {
		var fn = routes[toModel];

		convert[fromModel][toModel] = wrapRounded(fn);
		convert[fromModel][toModel].raw = wrapRaw(fn);
	});
});

module.exports = convert;

},{"./conversions":26,"./route":28}],28:[function(require,module,exports){
var conversions = require('./conversions');

/*
	this function routes a model to all other models.

	all functions that are routed have a property `.conversion` attached
	to the returned synthetic function. This property is an array
	of strings, each with the steps in between the 'from' and 'to'
	color models (inclusive).

	conversions that are not possible simply are not included.
*/

// https://jsperf.com/object-keys-vs-for-in-with-closure/3
var models = Object.keys(conversions);

function buildGraph() {
	var graph = {};

	for (var len = models.length, i = 0; i < len; i++) {
		graph[models[i]] = {
			// http://jsperf.com/1-vs-infinity
			// micro-opt, but this is simple.
			distance: -1,
			parent: null
		};
	}

	return graph;
}

// https://en.wikipedia.org/wiki/Breadth-first_search
function deriveBFS(fromModel) {
	var graph = buildGraph();
	var queue = [fromModel]; // unshift -> queue -> pop

	graph[fromModel].distance = 0;

	while (queue.length) {
		var current = queue.pop();
		var adjacents = Object.keys(conversions[current]);

		for (var len = adjacents.length, i = 0; i < len; i++) {
			var adjacent = adjacents[i];
			var node = graph[adjacent];

			if (node.distance === -1) {
				node.distance = graph[current].distance + 1;
				node.parent = current;
				queue.unshift(adjacent);
			}
		}
	}

	return graph;
}

function link(from, to) {
	return function (args) {
		return to(from(args));
	};
}

function wrapConversion(toModel, graph) {
	var path = [graph[toModel].parent, toModel];
	var fn = conversions[graph[toModel].parent][toModel];

	var cur = graph[toModel].parent;
	while (graph[cur].parent) {
		path.unshift(graph[cur].parent);
		fn = link(conversions[graph[cur].parent][cur], fn);
		cur = graph[cur].parent;
	}

	fn.conversion = path;
	return fn;
}

module.exports = function (fromModel) {
	var graph = deriveBFS(fromModel);
	var conversion = {};

	var models = Object.keys(graph);
	for (var len = models.length, i = 0; i < len; i++) {
		var toModel = models[i];
		var node = graph[toModel];

		if (node.parent === null) {
			// no possible conversion, or this node is the source model.
			continue;
		}

		conversion[toModel] = wrapConversion(toModel, graph);
	}

	return conversion;
};


},{"./conversions":26}],29:[function(require,module,exports){
module.exports = {
	"aliceblue": [240, 248, 255],
	"antiquewhite": [250, 235, 215],
	"aqua": [0, 255, 255],
	"aquamarine": [127, 255, 212],
	"azure": [240, 255, 255],
	"beige": [245, 245, 220],
	"bisque": [255, 228, 196],
	"black": [0, 0, 0],
	"blanchedalmond": [255, 235, 205],
	"blue": [0, 0, 255],
	"blueviolet": [138, 43, 226],
	"brown": [165, 42, 42],
	"burlywood": [222, 184, 135],
	"cadetblue": [95, 158, 160],
	"chartreuse": [127, 255, 0],
	"chocolate": [210, 105, 30],
	"coral": [255, 127, 80],
	"cornflowerblue": [100, 149, 237],
	"cornsilk": [255, 248, 220],
	"crimson": [220, 20, 60],
	"cyan": [0, 255, 255],
	"darkblue": [0, 0, 139],
	"darkcyan": [0, 139, 139],
	"darkgoldenrod": [184, 134, 11],
	"darkgray": [169, 169, 169],
	"darkgreen": [0, 100, 0],
	"darkgrey": [169, 169, 169],
	"darkkhaki": [189, 183, 107],
	"darkmagenta": [139, 0, 139],
	"darkolivegreen": [85, 107, 47],
	"darkorange": [255, 140, 0],
	"darkorchid": [153, 50, 204],
	"darkred": [139, 0, 0],
	"darksalmon": [233, 150, 122],
	"darkseagreen": [143, 188, 143],
	"darkslateblue": [72, 61, 139],
	"darkslategray": [47, 79, 79],
	"darkslategrey": [47, 79, 79],
	"darkturquoise": [0, 206, 209],
	"darkviolet": [148, 0, 211],
	"deeppink": [255, 20, 147],
	"deepskyblue": [0, 191, 255],
	"dimgray": [105, 105, 105],
	"dimgrey": [105, 105, 105],
	"dodgerblue": [30, 144, 255],
	"firebrick": [178, 34, 34],
	"floralwhite": [255, 250, 240],
	"forestgreen": [34, 139, 34],
	"fuchsia": [255, 0, 255],
	"gainsboro": [220, 220, 220],
	"ghostwhite": [248, 248, 255],
	"gold": [255, 215, 0],
	"goldenrod": [218, 165, 32],
	"gray": [128, 128, 128],
	"green": [0, 128, 0],
	"greenyellow": [173, 255, 47],
	"grey": [128, 128, 128],
	"honeydew": [240, 255, 240],
	"hotpink": [255, 105, 180],
	"indianred": [205, 92, 92],
	"indigo": [75, 0, 130],
	"ivory": [255, 255, 240],
	"khaki": [240, 230, 140],
	"lavender": [230, 230, 250],
	"lavenderblush": [255, 240, 245],
	"lawngreen": [124, 252, 0],
	"lemonchiffon": [255, 250, 205],
	"lightblue": [173, 216, 230],
	"lightcoral": [240, 128, 128],
	"lightcyan": [224, 255, 255],
	"lightgoldenrodyellow": [250, 250, 210],
	"lightgray": [211, 211, 211],
	"lightgreen": [144, 238, 144],
	"lightgrey": [211, 211, 211],
	"lightpink": [255, 182, 193],
	"lightsalmon": [255, 160, 122],
	"lightseagreen": [32, 178, 170],
	"lightskyblue": [135, 206, 250],
	"lightslategray": [119, 136, 153],
	"lightslategrey": [119, 136, 153],
	"lightsteelblue": [176, 196, 222],
	"lightyellow": [255, 255, 224],
	"lime": [0, 255, 0],
	"limegreen": [50, 205, 50],
	"linen": [250, 240, 230],
	"magenta": [255, 0, 255],
	"maroon": [128, 0, 0],
	"mediumaquamarine": [102, 205, 170],
	"mediumblue": [0, 0, 205],
	"mediumorchid": [186, 85, 211],
	"mediumpurple": [147, 112, 219],
	"mediumseagreen": [60, 179, 113],
	"mediumslateblue": [123, 104, 238],
	"mediumspringgreen": [0, 250, 154],
	"mediumturquoise": [72, 209, 204],
	"mediumvioletred": [199, 21, 133],
	"midnightblue": [25, 25, 112],
	"mintcream": [245, 255, 250],
	"mistyrose": [255, 228, 225],
	"moccasin": [255, 228, 181],
	"navajowhite": [255, 222, 173],
	"navy": [0, 0, 128],
	"oldlace": [253, 245, 230],
	"olive": [128, 128, 0],
	"olivedrab": [107, 142, 35],
	"orange": [255, 165, 0],
	"orangered": [255, 69, 0],
	"orchid": [218, 112, 214],
	"palegoldenrod": [238, 232, 170],
	"palegreen": [152, 251, 152],
	"paleturquoise": [175, 238, 238],
	"palevioletred": [219, 112, 147],
	"papayawhip": [255, 239, 213],
	"peachpuff": [255, 218, 185],
	"peru": [205, 133, 63],
	"pink": [255, 192, 203],
	"plum": [221, 160, 221],
	"powderblue": [176, 224, 230],
	"purple": [128, 0, 128],
	"rebeccapurple": [102, 51, 153],
	"red": [255, 0, 0],
	"rosybrown": [188, 143, 143],
	"royalblue": [65, 105, 225],
	"saddlebrown": [139, 69, 19],
	"salmon": [250, 128, 114],
	"sandybrown": [244, 164, 96],
	"seagreen": [46, 139, 87],
	"seashell": [255, 245, 238],
	"sienna": [160, 82, 45],
	"silver": [192, 192, 192],
	"skyblue": [135, 206, 235],
	"slateblue": [106, 90, 205],
	"slategray": [112, 128, 144],
	"slategrey": [112, 128, 144],
	"snow": [255, 250, 250],
	"springgreen": [0, 255, 127],
	"steelblue": [70, 130, 180],
	"tan": [210, 180, 140],
	"teal": [0, 128, 128],
	"thistle": [216, 191, 216],
	"tomato": [255, 99, 71],
	"turquoise": [64, 224, 208],
	"violet": [238, 130, 238],
	"wheat": [245, 222, 179],
	"white": [255, 255, 255],
	"whitesmoke": [245, 245, 245],
	"yellow": [255, 255, 0],
	"yellowgreen": [154, 205, 50]
};
},{}],30:[function(require,module,exports){
/* MIT license */
var colorNames = require('color-name');
var swizzle = require('simple-swizzle');

var reverseNames = {};

// create a list of reverse color names
for (var name in colorNames) {
	if (colorNames.hasOwnProperty(name)) {
		reverseNames[colorNames[name]] = name;
	}
}

var cs = module.exports = {
	to: {}
};

cs.get = function (string) {
	var prefix = string.substring(0, 3).toLowerCase();
	var val;
	var model;
	switch (prefix) {
		case 'hsl':
			val = cs.get.hsl(string);
			model = 'hsl';
			break;
		case 'hwb':
			val = cs.get.hwb(string);
			model = 'hwb';
			break;
		default:
			val = cs.get.rgb(string);
			model = 'rgb';
			break;
	}

	if (!val) {
		return null;
	}

	return {model: model, value: val};
};

cs.get.rgb = function (string) {
	if (!string) {
		return null;
	}

	var abbr = /^#([a-fA-F0-9]{3})$/;
	var hex = /^#([a-fA-F0-9]{6})$/;
	var rgba = /^rgba?\(\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/;
	var per = /^rgba?\(\s*([+-]?[\d\.]+)\%\s*,\s*([+-]?[\d\.]+)\%\s*,\s*([+-]?[\d\.]+)\%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/;
	var keyword = /(\D+)/;

	var rgb = [0, 0, 0, 1];
	var match;
	var i;

	if (match = string.match(abbr)) {
		match = match[1];

		for (i = 0; i < 3; i++) {
			rgb[i] = parseInt(match[i] + match[i], 16);
		}
	} else if (match = string.match(hex)) {
		match = match[1];

		for (i = 0; i < 3; i++) {
			// https://jsperf.com/slice-vs-substr-vs-substring-methods-long-string/19
			var i2 = i * 2;
			rgb[i] = parseInt(match.slice(i2, i2 + 2), 16);
		}
	} else if (match = string.match(rgba)) {
		for (i = 0; i < 3; i++) {
			rgb[i] = parseInt(match[i + 1], 0);
		}

		if (match[4]) {
			rgb[3] = parseFloat(match[4]);
		}
	} else if (match = string.match(per)) {
		for (i = 0; i < 3; i++) {
			rgb[i] = Math.round(parseFloat(match[i + 1]) * 2.55);
		}

		if (match[4]) {
			rgb[3] = parseFloat(match[4]);
		}
	} else if (match = string.match(keyword)) {
		if (match[1] === 'transparent') {
			return [0, 0, 0, 0];
		}

		rgb = colorNames[match[1]];

		if (!rgb) {
			return null;
		}

		rgb[3] = 1;

		return rgb;
	}

	for (i = 0; i < rgb.length; i++) {
		rgb[i] = clamp(rgb[i], 0, 255);
	}
	rgb[3] = clamp(rgb[3], 0, 1);

	return rgb;
};

cs.get.hsl = function (string) {
	if (!string) {
		return null;
	}

	var hsl = /^hsla?\(\s*([+-]?\d*[\.]?\d+)(?:deg)?\s*,\s*([+-]?[\d\.]+)%\s*,\s*([+-]?[\d\.]+)%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/;
	var match = string.match(hsl);

	if (match) {
		var alpha = parseFloat(match[4]);
		var h = ((parseFloat(match[1]) % 360) + 360) % 360;
		var s = clamp(parseFloat(match[2]), 0, 100);
		var l = clamp(parseFloat(match[3]), 0, 100);
		var a = clamp(isNaN(alpha) ? 1 : alpha, 0, 1);

		return [h, s, l, a];
	}

	return null;
};

cs.get.hwb = function (string) {
	if (!string) {
		return null;
	}

	var hwb = /^hwb\(\s*([+-]?\d*[\.]?\d+)(?:deg)?\s*,\s*([+-]?[\d\.]+)%\s*,\s*([+-]?[\d\.]+)%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/;
	var match = string.match(hwb);

	if (match) {
		var alpha = parseFloat(match[4]);
		var h = ((parseFloat(match[1]) % 360) + 360) % 360;
		var w = clamp(parseFloat(match[2]), 0, 100);
		var b = clamp(parseFloat(match[3]), 0, 100);
		var a = clamp(isNaN(alpha) ? 1 : alpha, 0, 1);
		return [h, w, b, a];
	}

	return null;
};

cs.to.hex = function (rgb) {
	return '#' + hexDouble(rgb[0]) + hexDouble(rgb[1]) + hexDouble(rgb[2]);
};

cs.to.rgb = function () {
	var rgba = swizzle(arguments);

	return rgba.length < 4 || rgba[3] === 1
		? 'rgb(' + Math.round(rgba[0]) + ', ' + Math.round(rgba[1]) + ', ' + Math.round(rgba[2]) + ')'
		: 'rgba(' + Math.round(rgba[0]) + ', ' + Math.round(rgba[1]) + ', ' + Math.round(rgba[2]) + ', ' + rgba[3] + ')';
};

cs.to.rgb.percent = function () {
	var rgba = swizzle(arguments);

	var r = Math.round(rgba[0] / 255 * 100);
	var g = Math.round(rgba[1] / 255 * 100);
	var b = Math.round(rgba[2] / 255 * 100);

	return rgba.length < 4 || rgba[3] === 1
		? 'rgb(' + r + '%, ' + g + '%, ' + b + '%)'
		: 'rgba(' + r + '%, ' + g + '%, ' + b + '%, ' + rgba[3] + ')';
};

cs.to.hsl = function () {
	var hsla = swizzle(arguments);
	return hsla.length < 4 || hsla[3] === 1
		? 'hsl(' + hsla[0] + ', ' + hsla[1] + '%, ' + hsla[2] + '%)'
		: 'hsla(' + hsla[0] + ', ' + hsla[1] + '%, ' + hsla[2] + '%, ' + hsla[3] + ')';
};

// hwb is a bit different than rgb(a) & hsl(a) since there is no alpha specific syntax
// (hwb have alpha optional & 1 is default value)
cs.to.hwb = function () {
	var hwba = swizzle(arguments);

	var a = '';
	if (hwba.length >= 4 && hwba[3] !== 1) {
		a = ', ' + hwba[3];
	}

	return 'hwb(' + hwba[0] + ', ' + hwba[1] + '%, ' + hwba[2] + '%' + a + ')';
};

cs.to.keyword = function (rgb) {
	return reverseNames[rgb.slice(0, 3)];
};

// helpers
function clamp(num, min, max) {
	return Math.min(Math.max(min, num), max);
}

function hexDouble(num) {
	var str = num.toString(16).toUpperCase();
	return (str.length < 2) ? '0' + str : str;
}

},{"color-name":29,"simple-swizzle":33}],31:[function(require,module,exports){
'use strict';

var colorString = require('color-string');
var convert = require('color-convert');

var _slice = [].slice;

var skippedModels = [
	// to be honest, I don't really feel like keyword belongs in color convert, but eh.
	'keyword',

	// gray conflicts with some method names, and has its own method defined.
	'gray',

	// shouldn't really be in color-convert either...
	'hex'
];

var hashedModelKeys = {};
Object.keys(convert).forEach(function (model) {
	hashedModelKeys[_slice.call(convert[model].labels).sort().join('')] = model;
});

var limiters = {};

function Color(obj, model) {
	if (!(this instanceof Color)) {
		return new Color(obj, model);
	}

	if (model && model in skippedModels) {
		model = null;
	}

	if (model && !(model in convert)) {
		throw new Error('Unknown model: ' + model);
	}

	var i;
	var channels;

	if (!obj) {
		this.model = 'rgb';
		this.color = [0, 0, 0];
		this.valpha = 1;
	} else if (obj instanceof Color) {
		this.model = obj.model;
		this.color = obj.color.slice();
		this.valpha = obj.valpha;
	} else if (typeof obj === 'string') {
		var result = colorString.get(obj);
		if (result === null) {
			throw new Error('Unable to parse color from string: ' + obj);
		}

		this.model = result.model;
		channels = convert[this.model].channels;
		this.color = result.value.slice(0, channels);
		this.valpha = typeof result.value[channels] === 'number' ? result.value[channels] : 1;
	} else if (obj.length) {
		this.model = model || 'rgb';
		channels = convert[this.model].channels;
		var newArr = _slice.call(obj, 0, channels);
		this.color = zeroArray(newArr, channels);
		this.valpha = typeof obj[channels] === 'number' ? obj[channels] : 1;
	} else if (typeof obj === 'number') {
		// this is always RGB - can be converted later on.
		obj &= 0xFFFFFF;
		this.model = 'rgb';
		this.color = [
			(obj >> 16) & 0xFF,
			(obj >> 8) & 0xFF,
			obj & 0xFF
		];
		this.valpha = 1;
	} else {
		this.valpha = 1;

		var keys = Object.keys(obj);
		if ('alpha' in obj) {
			keys.splice(keys.indexOf('alpha'), 1);
			this.valpha = typeof obj.alpha === 'number' ? obj.alpha : 0;
		}

		var hashedKeys = keys.sort().join('');
		if (!(hashedKeys in hashedModelKeys)) {
			throw new Error('Unable to parse color from object: ' + JSON.stringify(obj));
		}

		this.model = hashedModelKeys[hashedKeys];

		var labels = convert[this.model].labels;
		var color = [];
		for (i = 0; i < labels.length; i++) {
			color.push(obj[labels[i]]);
		}

		this.color = zeroArray(color);
	}

	// perform limitations (clamping, etc.)
	if (limiters[this.model]) {
		channels = convert[this.model].channels;
		for (i = 0; i < channels; i++) {
			var limit = limiters[this.model][i];
			if (limit) {
				this.color[i] = limit(this.color[i]);
			}
		}
	}

	this.valpha = Math.max(0, Math.min(1, this.valpha));

	if (Object.freeze) {
		Object.freeze(this);
	}
}

Color.prototype = {
	toString: function () {
		return this.string();
	},

	toJSON: function () {
		return this[this.model]();
	},

	string: function (places) {
		var self = this.model in colorString.to ? this : this.rgb();
		self = self.round(typeof places === 'number' ? places : 1);
		var args = self.valpha === 1 ? self.color : self.color.concat(this.valpha);
		return colorString.to[self.model](args);
	},

	percentString: function (places) {
		var self = this.rgb().round(typeof places === 'number' ? places : 1);
		var args = self.valpha === 1 ? self.color : self.color.concat(this.valpha);
		return colorString.to.rgb.percent(args);
	},

	array: function () {
		return this.valpha === 1 ? this.color.slice() : this.color.concat(this.valpha);
	},

	object: function () {
		var result = {};
		var channels = convert[this.model].channels;
		var labels = convert[this.model].labels;

		for (var i = 0; i < channels; i++) {
			result[labels[i]] = this.color[i];
		}

		if (this.valpha !== 1) {
			result.alpha = this.valpha;
		}

		return result;
	},

	unitArray: function () {
		var rgb = this.rgb().color;
		rgb[0] /= 255;
		rgb[1] /= 255;
		rgb[2] /= 255;

		if (this.valpha !== 1) {
			rgb.push(this.valpha);
		}

		return rgb;
	},

	unitObject: function () {
		var rgb = this.rgb().object();
		rgb.r /= 255;
		rgb.g /= 255;
		rgb.b /= 255;

		if (this.valpha !== 1) {
			rgb.alpha = this.valpha;
		}

		return rgb;
	},

	round: function (places) {
		places = Math.max(places || 0, 0);
		return new Color(this.color.map(roundToPlace(places)).concat(this.valpha), this.model);
	},

	alpha: function (val) {
		if (arguments.length) {
			return new Color(this.color.concat(Math.max(0, Math.min(1, val))), this.model);
		}

		return this.valpha;
	},

	// rgb
	red: getset('rgb', 0, maxfn(255)),
	green: getset('rgb', 1, maxfn(255)),
	blue: getset('rgb', 2, maxfn(255)),

	hue: getset(['hsl', 'hsv', 'hsl', 'hwb', 'hcg'], 0, function (val) { return ((val % 360) + 360) % 360; }), // eslint-disable-line brace-style

	saturationl: getset('hsl', 1, maxfn(100)),
	lightness: getset('hsl', 2, maxfn(100)),

	saturationv: getset('hsv', 1, maxfn(100)),
	value: getset('hsv', 2, maxfn(100)),

	chroma: getset('hcg', 1, maxfn(100)),
	gray: getset('hcg', 2, maxfn(100)),

	white: getset('hwb', 1, maxfn(100)),
	wblack: getset('hwb', 2, maxfn(100)),

	cyan: getset('cmyk', 0, maxfn(100)),
	magenta: getset('cmyk', 1, maxfn(100)),
	yellow: getset('cmyk', 2, maxfn(100)),
	black: getset('cmyk', 3, maxfn(100)),

	x: getset('xyz', 0, maxfn(100)),
	y: getset('xyz', 1, maxfn(100)),
	z: getset('xyz', 2, maxfn(100)),

	l: getset('lab', 0, maxfn(100)),
	a: getset('lab', 1),
	b: getset('lab', 2),

	keyword: function (val) {
		if (arguments.length) {
			return new Color(val);
		}

		return convert[this.model].keyword(this.color);
	},

	hex: function (val) {
		if (arguments.length) {
			return new Color(val);
		}

		return colorString.to.hex(this.rgb().round().color);
	},

	rgbNumber: function () {
		var rgb = this.rgb().color;
		return ((rgb[0] & 0xFF) << 16) | ((rgb[1] & 0xFF) << 8) | (rgb[2] & 0xFF);
	},

	luminosity: function () {
		// http://www.w3.org/TR/WCAG20/#relativeluminancedef
		var rgb = this.rgb().color;

		var lum = [];
		for (var i = 0; i < rgb.length; i++) {
			var chan = rgb[i] / 255;
			lum[i] = (chan <= 0.03928) ? chan / 12.92 : Math.pow(((chan + 0.055) / 1.055), 2.4);
		}

		return 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
	},

	contrast: function (color2) {
		// http://www.w3.org/TR/WCAG20/#contrast-ratiodef
		var lum1 = this.luminosity();
		var lum2 = color2.luminosity();

		if (lum1 > lum2) {
			return (lum1 + 0.05) / (lum2 + 0.05);
		}

		return (lum2 + 0.05) / (lum1 + 0.05);
	},

	level: function (color2) {
		var contrastRatio = this.contrast(color2);
		if (contrastRatio >= 7.1) {
			return 'AAA';
		}

		return (contrastRatio >= 4.5) ? 'AA' : '';
	},

	dark: function () {
		// YIQ equation from http://24ways.org/2010/calculating-color-contrast
		var rgb = this.rgb().color;
		var yiq = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
		return yiq < 128;
	},

	light: function () {
		return !this.dark();
	},

	negate: function () {
		var rgb = this.rgb();
		for (var i = 0; i < 3; i++) {
			rgb.color[i] = 255 - rgb.color[i];
		}
		return rgb;
	},

	lighten: function (ratio) {
		var hsl = this.hsl();
		hsl.color[2] += hsl.color[2] * ratio;
		return hsl;
	},

	darken: function (ratio) {
		var hsl = this.hsl();
		hsl.color[2] -= hsl.color[2] * ratio;
		return hsl;
	},

	saturate: function (ratio) {
		var hsl = this.hsl();
		hsl.color[1] += hsl.color[1] * ratio;
		return hsl;
	},

	desaturate: function (ratio) {
		var hsl = this.hsl();
		hsl.color[1] -= hsl.color[1] * ratio;
		return hsl;
	},

	whiten: function (ratio) {
		var hwb = this.hwb();
		hwb.color[1] += hwb.color[1] * ratio;
		return hwb;
	},

	blacken: function (ratio) {
		var hwb = this.hwb();
		hwb.color[2] += hwb.color[2] * ratio;
		return hwb;
	},

	grayscale: function () {
		// http://en.wikipedia.org/wiki/Grayscale#Converting_color_to_grayscale
		var rgb = this.rgb().color;
		var val = rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11;
		return Color.rgb(val, val, val);
	},

	fade: function (ratio) {
		return this.alpha(this.valpha - (this.valpha * ratio));
	},

	opaquer: function (ratio) {
		return this.alpha(this.valpha + (this.valpha * ratio));
	},

	rotate: function (degrees) {
		var hsl = this.hsl();
		var hue = hsl.color[0];
		hue = (hue + degrees) % 360;
		hue = hue < 0 ? 360 + hue : hue;
		hsl.color[0] = hue;
		return hsl;
	},

	mix: function (mixinColor, weight) {
		// ported from sass implementation in C
		// https://github.com/sass/libsass/blob/0e6b4a2850092356aa3ece07c6b249f0221caced/functions.cpp#L209
		var color1 = this.rgb();
		var color2 = mixinColor.rgb();
		var p = weight === undefined ? 0.5 : weight;

		var w = 2 * p - 1;
		var a = color1.alpha() - color2.alpha();

		var w1 = (((w * a === -1) ? w : (w + a) / (1 + w * a)) + 1) / 2.0;
		var w2 = 1 - w1;

		return Color.rgb(
				w1 * color1.red() + w2 * color2.red(),
				w1 * color1.green() + w2 * color2.green(),
				w1 * color1.blue() + w2 * color2.blue(),
				color1.alpha() * p + color2.alpha() * (1 - p));
	}
};

// model conversion methods and static constructors
Object.keys(convert).forEach(function (model) {
	if (skippedModels.indexOf(model) !== -1) {
		return;
	}

	var channels = convert[model].channels;

	// conversion methods
	Color.prototype[model] = function () {
		if (this.model === model) {
			return new Color(this);
		}

		if (arguments.length) {
			return new Color(arguments, model);
		}

		var newAlpha = typeof arguments[channels] === 'number' ? channels : this.valpha;
		return new Color(assertArray(convert[this.model][model].raw(this.color)).concat(newAlpha), model);
	};

	// 'static' construction methods
	Color[model] = function (color) {
		if (typeof color === 'number') {
			color = zeroArray(_slice.call(arguments), channels);
		}
		return new Color(color, model);
	};
});

function roundTo(num, places) {
	return Number(num.toFixed(places));
}

function roundToPlace(places) {
	return function (num) {
		return roundTo(num, places);
	};
}

function getset(model, channel, modifier) {
	model = Array.isArray(model) ? model : [model];

	model.forEach(function (m) {
		(limiters[m] || (limiters[m] = []))[channel] = modifier;
	});

	model = model[0];

	return function (val) {
		var result;

		if (arguments.length) {
			if (modifier) {
				val = modifier(val);
			}

			result = this[model]();
			result.color[channel] = val;
			return result;
		}

		result = this[model]().color[channel];
		if (modifier) {
			result = modifier(result);
		}

		return result;
	};
}

function maxfn(max) {
	return function (v) {
		return Math.max(0, Math.min(max, v));
	};
}

function assertArray(val) {
	return Array.isArray(val) ? val : [val];
}

function zeroArray(arr, length) {
	for (var i = 0; i < length; i++) {
		if (typeof arr[i] !== 'number') {
			arr[i] = 0;
		}
	}

	return arr;
}

module.exports = Color;

},{"color-convert":27,"color-string":30}],32:[function(require,module,exports){
'use strict';

module.exports = function isArrayish(obj) {
	if (!obj || typeof obj === 'string') {
		return false;
	}

	return obj instanceof Array || Array.isArray(obj) ||
		(obj.length >= 0 && (obj.splice instanceof Function ||
			(Object.getOwnPropertyDescriptor(obj, (obj.length - 1)) && obj.constructor.name !== 'String')));
};

},{}],33:[function(require,module,exports){
'use strict';

var isArrayish = require('is-arrayish');

var concat = Array.prototype.concat;
var slice = Array.prototype.slice;

var swizzle = module.exports = function swizzle(args) {
	var results = [];

	for (var i = 0, len = args.length; i < len; i++) {
		var arg = args[i];

		if (isArrayish(arg)) {
			// http://jsperf.com/javascript-array-concat-vs-push/98
			results = concat.call(results, slice.call(arg));
		} else {
			results.push(arg);
		}
	}

	return results;
};

swizzle.wrap = function (fn) {
	return function () {
		return fn(swizzle(arguments));
	};
};

},{"is-arrayish":32}],34:[function(require,module,exports){

},{}],35:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return b64.length * 3 / 4 - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],36:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('Invalid typed array length')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (value instanceof ArrayBuffer) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  return fromObject(value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj) {
    if (ArrayBuffer.isView(obj) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(0)
      }
      return fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || string instanceof ArrayBuffer) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : new Buffer(val, encoding)
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

},{"base64-js":35,"ieee754":37}],37:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],38:[function(require,module,exports){

var indexOf = [].indexOf;

module.exports = function(arr, obj){
  if (indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
},{}],39:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":40}],40:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],41:[function(require,module,exports){
var indexOf = require('indexof');

var Object_keys = function (obj) {
    if (Object.keys) return Object.keys(obj)
    else {
        var res = [];
        for (var key in obj) res.push(key)
        return res;
    }
};

var forEach = function (xs, fn) {
    if (xs.forEach) return xs.forEach(fn)
    else for (var i = 0; i < xs.length; i++) {
        fn(xs[i], i, xs);
    }
};

var defineProp = (function() {
    try {
        Object.defineProperty({}, '_', {});
        return function(obj, name, value) {
            Object.defineProperty(obj, name, {
                writable: true,
                enumerable: false,
                configurable: true,
                value: value
            })
        };
    } catch(e) {
        return function(obj, name, value) {
            obj[name] = value;
        };
    }
}());

var globals = ['Array', 'Boolean', 'Date', 'Error', 'EvalError', 'Function',
'Infinity', 'JSON', 'Math', 'NaN', 'Number', 'Object', 'RangeError',
'ReferenceError', 'RegExp', 'String', 'SyntaxError', 'TypeError', 'URIError',
'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'escape',
'eval', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'undefined', 'unescape'];

function Context() {}
Context.prototype = {};

var Script = exports.Script = function NodeScript (code) {
    if (!(this instanceof Script)) return new Script(code);
    this.code = code;
};

Script.prototype.runInContext = function (context) {
    if (!(context instanceof Context)) {
        throw new TypeError("needs a 'context' argument.");
    }
    
    var iframe = document.createElement('iframe');
    if (!iframe.style) iframe.style = {};
    iframe.style.display = 'none';
    
    document.body.appendChild(iframe);
    
    var win = iframe.contentWindow;
    var wEval = win.eval, wExecScript = win.execScript;

    if (!wEval && wExecScript) {
        // win.eval() magically appears when this is called in IE:
        wExecScript.call(win, 'null');
        wEval = win.eval;
    }
    
    forEach(Object_keys(context), function (key) {
        win[key] = context[key];
    });
    forEach(globals, function (key) {
        if (context[key]) {
            win[key] = context[key];
        }
    });
    
    var winKeys = Object_keys(win);

    var res = wEval.call(win, this.code);
    
    forEach(Object_keys(win), function (key) {
        // Avoid copying circular objects like `top` and `window` by only
        // updating existing context properties or new properties in the `win`
        // that was only introduced after the eval.
        if (key in context || indexOf(winKeys, key) === -1) {
            context[key] = win[key];
        }
    });

    forEach(globals, function (key) {
        if (!(key in context)) {
            defineProp(context, key, win[key]);
        }
    });
    
    document.body.removeChild(iframe);
    
    return res;
};

Script.prototype.runInThisContext = function () {
    return eval(this.code); // maybe...
};

Script.prototype.runInNewContext = function (context) {
    var ctx = Script.createContext(context);
    var res = this.runInContext(ctx);

    forEach(Object_keys(ctx), function (key) {
        context[key] = ctx[key];
    });

    return res;
};

forEach(Object_keys(Script.prototype), function (name) {
    exports[name] = Script[name] = function (code) {
        var s = Script(code);
        return s[name].apply(s, [].slice.call(arguments, 1));
    };
});

exports.createScript = function (code) {
    return exports.Script(code);
};

exports.createContext = Script.createContext = function (context) {
    var copy = new Context();
    if(typeof context === 'object') {
        forEach(Object_keys(context), function (key) {
            copy[key] = context[key];
        });
    }
    return copy;
};

},{"indexof":38}]},{},[1]);
