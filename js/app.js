console.log("running\n");

// key codes
var Key = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40,
A: 65, B: 66, C: 67, D: 68, E: 69, F: 70, G: 71, H: 72, I: 73, J: 74, K: 75, L: 76, M: 77,
N: 78, O: 79, P: 80, Q: 81, R: 82, S: 83, T: 84, U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90};

var images = [];
var done = 0;
var display = 1;
var dir;
var curPanel = 0;
var first = 0;
var last = images.length;

// Positional variables for the image and the window
var pos = $(this).offset(),
wX = $(window).scrollLeft(), wY = $(window).scrollTop(),
wH = $(window).height(), wW = $(window).width(),
oH = $(this).outerHeight(), oW = $(this).outerWidth();
$outer_container=$("#outer_container");
$imagePan_panning=$("#imagePan .panning");
$imagePan=$("#imagePan");
$imagePan_container=$("#imagePan .container");


// Set the menu to be visible
$('#menubar').show();


//Generic error handler
function errorHandler(e) {
  console.log("*** ERROR ***");
  console.dir(e);
}

// Generic Setting handler for the app
function saveSettings() {
  chrome.storage.local.set(['settings']);
}

function loadSettings() {

}

function init() {
  console.log("init loaded");
  reset();
  document.addEventListener("keydown", keyHandler, false);
  navigator.webkitTemporaryStorage.requestQuota(20*1024*1024, function(grantedBytes) {
    window.webkitRequestFileSystem(window.TEMPORARY, grantedBytes, onInitFs, errorHandler);
  }, errorHandler);
}

function onInitFs(fs) {
  dir = fs.root;
  $(document).on("dragover", dragOverHandler);

  $(document).on("drop", dropHandler);
  console.log('onInitFs done, new');
}

function dragOverHandler(e) {
  e.preventDefault();
}

function dropHandler(e) {
  e.stopPropagation();
  e.preventDefault();

  if(!e.originalEvent.dataTransfer.files) return;
  var files = e.originalEvent.dataTransfer.files;
  var count = files.length;

   if(!count) return;

   //Only one file allowed
   if(count > 1) {
     doError("You may only drop one file.");
     return;
   }

   handleFile(files[0]);
 }

$('#openbtn').click(function(e) {
  e.preventDefault();
  openFile();
});

function openFile() {
  console.log("Choose file\n");
  var accepts = [{
    extensions: ['zip', 'cbz']
  }];
  chrome.fileSystem.chooseEntry({type: 'openFile', accepts: accepts}, function(theEntry) {
    if (!theEntry) {
      console.log("No Entry chosen\n");
      return;
    }
    // use local storage to retain access to this file
    chrome.storage.local.set({'chosenFile': chrome.fileSystem.retainEntry(theEntry)});
    theEntry.file(function(file) {
      reset();
      handleFile(file);
    });
  });
}

// Load the files
function handleFile(file) {
  console.log(file);
  // Set the script path
  zip.workerScriptsPath = "js/lib/";

  // Reset the app
  reset();

  zip.createReader(new zip.BlobReader(file), function(reader) {
    console.log("Created reader.");
    reader.getEntries(function(entries) {
      console.log("Got entries.");

      entries.forEach(function(entry) {
        
        if(!entry.directory && entry.filename.indexOf(".jpg") != -1) {

          //rewrite w/o a path
          var cleanName = entry.filename;
          if(cleanName.indexOf("/") >= 0) cleanName = cleanName.split("/").pop();

          dir.getFile(cleanName, {create:true}, function(file) {
            console.log("Yes, I opened "+file.fullPath);
            images.push({path:file.toURL(), loaded:false});
  
            entry.getData(new zip.FileWriter(file), function(e) {
              done++;
              var perc = Math.floor((done/images.length)*100);

              for(var i=0; i<images.length; i++) {
                if(images[i].path == file.toURL()) {
                  images[i].loaded = true;
                  break;
                }
              }

              if(done == images.length) {
                last = images.length;
                spread(1);
              }
              else showProgress(images.length);
            });
          }, errorHandler());
          drawPanel(curPanel);
          last = images.length;
          spread(1);
        }
      });
    });
  }, function(err) {
    console.dir(err);
  });
}

function showProgress() {

}

$('#frstbtn').click(function(e) {
  e.preventDefault();
  frstPanel();
});

$('#nextbtn').click(function(e) {
  e.preventDefault();
  nextPanel();
});

$('#prevbtn').click(function(e) {
  e.preventDefault();
  prevPanel();
});

$('#lastbtn').click(function(e) {
  e.preventDefault();
  lastPanel();
});

function lastPanel() {
  if(curPanel != last - display) drawPanel(images.length - display);
  console.log(curPanel);
}

function prevPanel() {
  if(curPanel > first) drawPanel(curPanel - display);
  console.log(curPanel);
}

function frstPanel() {
  if(curPanel != first) drawPanel(first);
  console.log(curPanel);
}

function nextPanel() {
  if(curPanel+display < last - display) drawPanel(curPanel + display);
  console.log(curPanel);
}

function drawPanel(num) {
  curPanel = num;

  $("#image_display img").each(function( index ) {
    if (num+index >= images.length || num+index < 0) {
      $(this).hide();
    } else {
      $(this).attr("src",images[num+index].path);
      $(this).show();
    }
  });

  $("#page_count").each(function( index ) {
    if (num+index >= images.length || num+index < 0) {
      $(this).hide();
    } else {
      $(this).text((curPanel + 1) + "/" + (images.length - 1));
      $(this).show();
    }
  });
}

function keyHandler(evt) {
  var code = evt.keyCode;
  if (code == Key.O) {
    openFile();
  }

  if (evt.ctrlKey || evt.shiftKey || evt.metaKey) return;
  switch(code) {
    case Key.UP:
      moveUp();
      break;
    case Key.DOWN:
      moveDown();
      break;
    case Key.LEFT:
      prevPanel();
      break;
    case Key.RIGHT:
      nextPanel();
      break;
    case Key.H:
      fitHorizontal();
      break;
    case Key.V:
      fitVertical();
      break;
    case Key.B:
      fitBoth();
      break;
    case Key.F:
      frstPanel();
      break;
    case Key.L:
      lastPanel();
      break;
    case Key.X:
      hideControls();
      break;
    default:
      console.log("KeyCode = " + code);
      break;
  }
}

function reset() {
  images = [];
  done = 0;
  display = 1;
  curPanel = 0;
  first = 0;
  last = images.length;
  drawPanel(curPanel);
  $('#frstbtn').click(null);
  $('#nextbtn').click(null);
  $('#prevbtn').click(null);
  $('#lastbtn').click(null);
  $("#image_display img").hide();
  $('#page_count').hide();
}

function updatePos() {
  pos = $("#image_display img").offset();
  wX = $(window).scrollLeft();
  wY = $(window).scrollTop();
  wH = $(window).height();
  wW = $(window).width();
  oH = $("#image_display img").outerHeight();
  oW = $("#image_display img").outerWidth();
}

function moveUp() {
  updatePos();
  // Check edge
  if(pos.top >= wY) {
    $("image_display img").animate({
      bottom: '+= 25px'
    }, 100, 'linear');
  }
}

function moveDown() {
  updatePos();
  // Check edge
  if(pos.top <= wY + wH) {
    $("image_display img").animate({
      bottom: '-= 25px'
    }, 100, 'linear');
  }
}

function hideControls() {
  if($('#menubar').is(":visible")) $('#menubar').hide();
  else $('#menubar').show();
}

function fitHorizontal() {
  $("#image_display img").removeClass();
  $("#image_display img").addClass('fitHorizontal');
}

function fitVertical() {
  $("#image_display img").removeClass();
  $("#image_display img").addClass('fitVertical');
}
function fitBoth() {
  $("#image_display img").removeClass();
  $("#image_display img").addClass('fitBoth');
}

function spread(num) {
  $('body').removeClass('spread'+display);
  display = num;
  $('body').addClass('spread'+display);

  $("#comicImages").empty();
  for(i=0; i < display; i++) {
    var image = document.createElement("img");
    $("#comicImages").append(image);
  }

  drawPanel(curPanel);
  fitBoth();
}


function dragImage() {
  wH = $(window).height();
  wW = $(window).width();
}

/*
// From http://manos.malihu.gr/jquery-image-panning/ Thanks :)
function panning() {

  $imagePan_panning.css("margin-top",($imagePan.height()-$imagePan_panning.height())/2+"px");
  containerWidth=$imagePan.width();
  containerHeight=$imagePan.height();
  totalContentW=$imagePan_panning.width();
  totalContentH=$imagePan_panning.height();
  // $imagePan_container.css("width",totalContentW).css("height",totalContentH);

  function MouseMove(e){
    var mouseCoordsX=(e.pageX - $imagePan.offset().left);
    var mouseCoordsY=(e.pageY - $imagePan.offset().top);
    var mousePercentX=mouseCoordsX/containerWidth;
    var mousePercentY=mouseCoordsY/containerHeight;
    var destX=-(((totalContentW-(containerWidth))-containerWidth)*(mousePercentX));
    var destY=-(((totalContentH-(containerHeight))-containerHeight)*(mousePercentY));
    var thePosA=mouseCoordsX-destX;
    var thePosB=destX-mouseCoordsX;
    var thePosC=mouseCoordsY-destY;
    var thePosD=destY-mouseCoordsY;
    var marginL=$imagePan_panning.css("marginLeft").replace("px", "");
    var marginT=$imagePan_panning.css("marginTop").replace("px", "");
    var animSpeed=500; //ease amount
    var easeType="easeOutCirc";
    if(mouseCoordsX<destX || mouseCoordsY<destY){
        //$imagePan_container.css("left",-thePosA-marginL); $imagePan_container.css("top",-thePosC-marginT); //without easing
        $imagePan_container.stop().animate({left: -thePosA-marginL, top: -thePosC-marginT}, animSpeed, "linear"); //with easing
    } else if(mouseCoordsX>destX || mouseCoordsY>destY){
        //$imagePan_container.css("left",thePosB-marginL); $imagePan_container.css("top",thePosD-marginT); //without easing
        $imagePan_container.stop().animate({left: thePosB-marginL, top: thePosD-marginT}, animSpeed, "linear"); //with easing
    } else {
        $imagePan_container.stop();
    }
  }

  $imagePan_panning.css("margin-left",($imagePan.width()-$imagePan_panning.width())/2).css("margin-top",($imagePan.height()-$imagePan_panning.height())/2);

  $imagePan.bind("mousemove", function(event){
      MouseMove(event);
  });
}
 
$(window).resize(function() {
    $imagePan.unbind("mousemove");
    $imagePan_container.css("top",0).css("left",0);
    dragImage();
});*/

window.onload = init();