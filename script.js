var canvas, ctx;
var X11Colors = ["AliceBlue","AntiqueWhite","Aqua","Aquamarine","Azure","Beige","Bisque","Black","BlanchedAlmond","Blue","BlueViolet","Brown","BurlyWood","CadetBlue","Chartreuse","Chocolate","Coral","CornflowerBlue","Cornsilk","Crimson","Cyan","DarkBlue","DarkCyan","DarkGoldenRod","DarkGray","DarkGrey","DarkGreen","DarkKhaki","DarkMagenta","DarkOliveGreen","Darkorange","DarkOrchid","DarkRed","DarkSalmon","DarkSeaGreen","DarkSlateBlue","DarkSlateGray","DarkSlateGrey","DarkTurquoise","DarkViolet","DeepPink","DeepSkyBlue","DimGray","DimGrey","DodgerBlue","FireBrick","FloralWhite","ForestGreen","Fuchsia","Gainsboro","GhostWhite","Gold","GoldenRod","Gray","Grey","Green","GreenYellow","HoneyDew","HotPink","IndianRed","Indigo","Ivory","Khaki","Lavender","LavenderBlush","LawnGreen","LemonChiffon","LightBlue","LightCoral","LightCyan","LightGoldenRodYellow","LightGray","LightGrey","LightGreen","LightPink","LightSalmon","LightSeaGreen","LightSkyBlue","LightSlateGray","LightSlateGrey","LightSteelBlue","LightYellow","Lime","LimeGreen","Linen","Magenta","Maroon","MediumAquaMarine","MediumBlue","MediumOrchid","MediumPurple","MediumSeaGreen","MediumSlateBlue","MediumSpringGreen","MediumTurquoise","MediumVioletRed","MidnightBlue","MintCream","MistyRose","Moccasin","NavajoWhite","Navy","OldLace","Olive","OliveDrab","Orange","OrangeRed","Orchid","PaleGoldenRod","PaleGreen","PaleTurquoise","PaleVioletRed","PapayaWhip","PeachPuff","Peru","Pink","Plum","PowderBlue","Purple","Red","RosyBrown","RoyalBlue","SaddleBrown","Salmon","SandyBrown","SeaGreen","SeaShell","Sienna","Silver","SkyBlue","SlateBlue","SlateGray","SlateGrey","Snow","SpringGreen","SteelBlue","Tan","Teal","Thistle","Tomato","Turquoise","Violet","Wheat","White","WhiteSmoke","Yellow","YellowGreen"];
var code, codeLast, codeView;
var resetBtn, thinkBtn;

function setup() {
  document.body.addEventListener('touchmove', function(e) {
      // This prevents native scrolling from happening.
      e.preventDefault();
  }, false);
  noLoop();
  setShakeThreshold(30);
  canvas = document.getElementById('art');
  ctx = canvas.getContext('2d');
  code = "background "+X11Colors[Math.floor(random(0,X11Colors.length))];
  code = code.toLowerCase();
  codeLast = code;
  
  codeView = select('#codeView');
  
  resetBtn = createButton('🐕');
  resetBtn.addClass('resetBtn');
  resetBtn.mouseReleased(resetArt);
  thinkBtn = createButton('💭');
  thinkBtn.addClass('thinkBtn');
  thinkBtn.mouseReleased(newThought);
  
}

function draw() {
  try {
    window.makeArtPlease(code,ctx);
  } catch(err) {
    console.log(err);
    console.log("Errors? Who cares?");
  }
  
  newThought();
}

function addCard(thought) {
  var divDraggable = createDiv(''); 
  var divDragbox = createDiv(''); 
  var pText = createElement('pre',thought);
  divDragbox.class('dragbox start');
  divDraggable.class('draggable');
  pText.parent(divDragbox);
  divDragbox.parent(divDraggable);
  divDraggable.parent('#holder')
  divDraggable.attribute('thought', thought);
  var startHue = random(0,360);
  divDragbox.style("background", "linear-gradient("+random(0,360)+"deg, hsla("+startHue+", 100%, 50%,1) 0%, hsla("+(startHue + 40)% 360+", 100%, 50%,0.5) 49%, hsla("+(startHue + 60)% 360+", 100%, 50%,0.5) 100%)");

  interact('.draggable')
  .draggable({
    inertia: {
      resistance: 5,
      minSpeed: 200,
      endSpeed: 100
    },

    onstart: function (event) {
      event.target.className = "draggable dragging";      
    },

    onmove: dragMoveListener,
    onend: function (event) {
      var target = event.target,
      // keep the dragged position in the data-x/data-y attributes
      x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
      y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
      
      event.target.className = "draggable";
      // var textEl = event.target.querySelector('p');
      if (x < -900) {
        interact('.draggable').unset();
        event.target.remove();
        newThought();
      }
    
      if (x > 1000) {
        processThought(event.target.getAttribute('thought'));
        interact('.draggable').unset();
        event.target.remove();
        newThought();
      }
      
    }
  });
  
  function dragMoveListener (event) {
    var target = event.target,
        // keep the dragged position in the data-x/data-y attributes
        x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
        y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
    
    
    
    // translate the element
    target.style.webkitTransform =
    target.style.transform =
      'translate(' + x + 'px, ' + y + 'px) rotate('+x*0.1+'deg)';

    // update the posiion attributes
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
    
  }

  // this is used later in the resizing and gesture demos
  window.dragMoveListener = dragMoveListener;
  setTimeout(function(){ divDragbox.removeClass('start'); }, 10);
  
}

function newThought() {
  httpGet("http://modern.local:1337/?lastline="+codeLast,addCard);
  
}
var shakeCounter = 0;
function deviceShaken() {
  shakeCounter = (shakeCounter + 1) % 50;
  if (shakeCounter == 48) {
    var codeLines = code.split('\n');
    code = "";
    for (var i = 0; i < codeLines.length - 1; i++) {
      code = code + "\n" + codeLines[i];
    }
    try {
      window.makeArtPlease(code,ctx);
    } catch(err) {
      console.log(err);
      console.log("Errors? Who cares?");
    }
    codeView.html("<pre>"+code+"</pre>");
    codeView.elt.scrollTop = codeView.elt.scrollHeight;
  }
}


function processThought(thought) {
  console.log(thought);
  code = code + "\n" + thought;
  try {
    window.makeArtPlease(code,ctx);
  } catch(err) {
    console.log(err);
    console.log("Errors? Who cares?");
  }
  
  console.log(code);
  console.log("-------");
  var codeLines = code.split('\n');
  codeLast = codeLines.pop();
  codeView.html("<pre>"+code+"</pre>");
  codeView.elt.scrollTop = codeView.elt.scrollHeight;  
}

function resetArt() {
  location.reload();
}