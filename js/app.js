console.log("running\n");

// key codes
var Key = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40,
A: 65, B: 66, C: 67, D: 68, E: 69, F: 70, G: 71, H: 72, I: 73, J: 74, K: 75, L: 76, M: 77,
N: 78, O: 79, P: 80, Q: 81, R: 82, S: 83, T: 84, U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90};

// Settings object
var settings = {modeDisplay: 0, spread: 0, nextKey: 0, prevKey: 0, firstKey: 0, lastKey: 0, openKey: 0, settingKey: 0};

// Settings Array of keys
var settingKeys = ["modeDisplay", "spread", "nextKey", "prevKey", "firstKey", "lastKey", "openKey", "settingKey"];

//--------------------------------------------------
// Variables
// Image Control variables
var div_ref = null,
  div_half_width = null,
  div_half_height = null,
  img_ref = null,
  img_orig_width = null,
  img_orig_height = null,
  img_zoom_width = null,
  img_zoom_height = null,
  img_start_left = null,
  img_start_top = null,
  img_current_left = null,
  img_current_top = null,
  zoom_control_refs = {},
  zoom_level = 1,
  zoom_levels = [],
  zoom_level_count = [],
  click_last = 0,
  origin = null,
  html_ref = null;

// For loading and controling comics display
var images = [];
var done = 0;
var display = 1;
var dir;
var curPanel = 0;
var first = 0;
var last = images.length;
var displayMode = 0;

// Set the menu to be visible
$('#menubar').show();

//Generic error handler
function errorHandler(e) {
  console.log("*** ERROR ***");
  console.dir(e);
}

// Generic Setting handler for the app
function saveSettings() {
  chrome.storage.local.set({'spread':display, 'displayMode': displayMode}, function() {
    message("saved");
  });
}

function loadSettings() {
  for(var key in settingKeys) {
    chrome.storage.local.get(key, function(result) {
      settings[key] = result;
    });
  }
}

var ImageFile = function(file) {
  this.filename = file.filename;
  var fileExtension = file.filename.split('.').pop().toLowerCase();
  var mimeType = fileExtension == 'png' ? 'image/png' :
      (fileExtension == 'jpg' || fileExtension == 'jpeg') ? 'image/jpeg' :
      fileExtension == 'gif' ? 'image/gif' : undefined;
  this.dataURI = createURLFromArray(file.fileData, mimeType);
  this.data = file;
};

function init() {
  console.log("init loaded");
  reset();
  $(document).keydown(function(event) {
    keyHandler(event);
  });
  navigator.webkitTemporaryStorage.requestQuota(80*1024*1024, function(grantedBytes) {
    window.webkitRequestFileSystem(window.TEMPORARY, grantedBytes, onInitFs, errorHandler);
  }, errorHandler);
}

function onInitFs(fs) {
  dir = fs.root;
  $(document).on("dragover", dragOverHandler);

  $(document).on("drop", dropHandler);
  console.log('onInitFs done, new');
}

// Draf and droop contols
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

// Open files through filesystem 
$('#openbtn').click(function(e) {
  e.preventDefault();
  openFile();
});

function openFile() {
  console.log("Choose file\n");
  var accepts = [{
    extensions: ['zip', 'cbz', 'rar', 'cbr', 'tar']
  }];
  chrome.fileSystem.chooseEntry({type: 'openFile', accepts: accepts}, function(theEntry) {
    if (!theEntry) {
      console.log("No Entry chosen\n");
      return;
    }
    // use local storage to retain access to this file
    chrome.storage.local.set({'chosenFile': chrome.fileSystem.retainEntry(theEntry)});
    // handleFile(theEntry);
    theEntry.file(function(file) {
      reset();
      handleFile(file);
    });
  });
}

// Load the files
function handleFile(file) {
  if (true) {
    reset();
    var fr = new FileReader();
    fr.onload = function() {
      var ab = fr.result;
      var h = new Uint8Array(ab, 0, 10);
      var pathToBitJS = "js/bitjs/";
      var unarchiver = null;
      if (h[0] == 0x52 && h[1] == 0x61 && h[2] == 0x72 && h[3] == 0x21) { //Rar!
        unarchiver = new bitjs.archive.Unrarrer(ab, pathToBitJS);
      } else if (h[0] == 80 && h[1] == 75) { //PK (Zip)
        unarchiver = new bitjs.archive.Unzipper(ab, pathToBitJS);
      } else { // Try with tar
        unarchiver = new bitjs.archive.Untarrer(ab, pathToBitJS);
      }
      // Listen for UnarchiveEvents.
      if (unarchiver) {
        unarchiver.addEventListener(bitjs.archive.UnarchiveEvent.Type.PROGRESS,
          function(e) {
            var percentage = e.currentBytesUnarchived / e.totalUncompressedBytesInArchive;
            last = e.totalFilesInArchive;
            lastCompletion = percentage * 100;
            
          });
        unarchiver.addEventListener(bitjs.archive.UnarchiveEvent.Type.INFO,
          function(e) {
            console.log(e.msg);
          });
        unarchiver.addEventListener(bitjs.archive.UnarchiveEvent.Type.EXTRACT,
          function(e) {
            // convert DecompressedFile into a bunch of ImageFiles
            if (e.unarchivedFile) {
              var f = e.unarchivedFile;
              
              //rewrite w/o a path
              var cleanName = f.filename;
              if(cleanName.indexOf("\\") >= 0) cleanName = cleanName.split("\\").pop();

              // Push file info to save later
              images.push({path:'', name:cleanName, loaded:false, data:f});
            }

          });
        unarchiver.addEventListener(bitjs.archive.UnarchiveEvent.Type.FINISH,
          function(e) {
            console.log("Done Extracting, Begin Saving");
            saveFiles(0);
          });
        unarchiver.start();
      } else {
        alert("Some error");
      }
    };
    fr.readAsArrayBuffer(file);
  }
}

function saveFiles(index) {
    var fileExtension = images[index].name.split(".").pop().toLowerCase();
    var mimeType = fileExtension == 'png' ? 'image/png' :
      (fileExtension == 'jpg' || fileExtension == 'jpeg') ? 'image/jpeg' :
      fileExtension == 'gif' ? 'image/gif' : undefined;

    // Initializing the worker
    var worker = new Worker('js/fileworker.js');
    // Run worker
    worker.onmessage = function(e) {
      console.log(e.data);
      if (e.data.url) {
        images[index].path = e.data.url;
        images[index].loaded = true;
        drawPanel(curPanel);
        if (index < images.length -1)
          saveFiles(index + 1);
      }
    };
    worker.postMessage({fileName: images[index].name,
      blob: images[index].data.fileData, type: mimeType});
}

// Progress Model
/*function showProgress() {

}*/

// Gallary controls
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
  image_zoom_out(1 - zoom_level);
  if(curPanel != last - display) drawPanel(images.length - display);
  console.log(curPanel);
}

function prevPanel() {
  image_zoom_out(1 - zoom_level);
  if(curPanel > first) drawPanel(curPanel - display);
  console.log(curPanel);
}

function frstPanel() {
  image_zoom_out(1 - zoom_level);
  if(curPanel != first) drawPanel(first);
  console.log(curPanel);
}

function nextPanel() {
  image_zoom_out(1 - zoom_level);
  if(curPanel+display < last - display) drawPanel(curPanel + display);
  console.log(curPanel);
}

// Draw image on the screen
function drawPanel(num) {
  curPanel = num;

  $("#page_count").each(function( index ) {
    if (num+index >= images.length || num+index < 0) {
      $(this).hide();
    } else {
      $(this).text((curPanel + 1) + "/" + (images.length - 1));
      $(this).show();
    }
  });

  // Show image only if there is an image to show
  $("#image_display img").each(function( index ) {
    if (num+index >= images.length || num+index < 0) {
      $(this).hide();
    } else {
      $(this).unbind("load");
      $(this).load(function() {
        $(this).removeAttr("height");
        $(this).removeAttr("width");
        $(this).height("auto");
        $(this).width("auto");
        fitBoth();
        addImageControls();
        resetPos();
      }).attr("src",images[num+index].path);
      $(this).show();
    }
  });
}

// Handeler for keyboard controls 
function keyHandler(evt) {
  var code = evt.keyCode;
  if (code == Key.O) {
    openFile();
  }

  if (evt.ctrlKey || evt.shiftKey || evt.metaKey) return;
  switch(code) {
    case Key.LEFT:
      if ($("#image_display img").position().left < 0) {
        get_position();
        img_current_left += 50;
        image_move_update();
        if($("#image_display img").position().left > 0) {
          $("#image_display img").offset({top: img_current_top, left: 0});
        }
      } else prevPanel();
      break;
    case Key.RIGHT:
      if ($("#image_display img").position().left > -($("#image_display img").width() - $(document).width())) {
        get_position();
        img_current_left -= 50;
        image_move_update();
        if($("#image_display img").position().left < -($("#image_display img").width() - $(document).width())) {
          $("#image_display img").offset({top: img_current_top, left: -($("#image_display img").width() - $(document).width())});
        }
      } else nextPanel();
      break;
    case Key.UP:
      if($("#image_display img").position().top < 0) {
        get_position();
        img_current_top += 50;
        image_move_update();
      }
      break;
    case Key.DOWN:
      if($("#image_display img").position().top > -($("#image_display img").height() - $(document).height())) {
        get_position();
        img_current_top -= 50;
        image_move_update();
      }
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
    case Key.I:
      console.log("Image: width- " + $('#image_display img').width() + " height- " + $('#image_display img').height());
      break;
    default:
      console.log("KeyCode = " + code);
      break;
  }
}

// Reset to defaults on reload
function reset() {
  resetPos();
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

// Toggle the controlbar on and off 
function hideControls() {
  if($('#menubar').is(":visible")) $('#menubar').hide();
  else $('#menubar').show();
}

// Differnt display settings 
function fitBoth() {
  $("#image_display img").removeClass();
  $("#image_display img").addClass('fitBoth');
  resetPos();
}

// Ability to show more than one page at a time
function spread(num) {
  $('body').removeClass('spread'+display);
  display = num;
  $('body').addClass('spread'+display);
  resetPos();
  $("#image_display").empty();
  for(i=0; i < display; i++) {
    var image = document.createElement("img");
    $("#image_display").append(image);
  }

  drawPanel(curPanel);
  fitBoth();
}

// initilize settings on winow load
window.onload = init();

// Adapting the image size on window resize
$(window).resize(function() {
  resetPos();
  fitBoth();
});

/*Zoomify - Code to control the image*/

function resetPos() {
  // ($(window).width() - $("#image_display img").width())/2
  $("#image_display img").offset({ top: 0, left: 0 });
  $("#image_display").offset({ top: 0, left: 0 });
}

// Enlarge or shrink the images
function image_zoom(change) {
  if(!(img_ref && div_ref)) return;
  //--------------------------------------------------
  // Variables
  var new_zoom,
    new_zoom_width,
    new_zoom_height,
    ratio;

  //--------------------------------------------------
  // Zoom level
  // TODO:  Add new onscreen zoom controls 
  new_zoom = (zoom_level + change);
  img_ref.removeClass();
  if (new_zoom >= 3) {
    if (new_zoom > 3) {
      // div_ref.fadeto(75,0.5);
      // div_ref.fadeto(75,1);
      return;
    }
    // zoom_control_refs['in-on'].style.display = 'none';
    // zoom_control_refs['in-off'].style.display = 'block';
  } else {
    // zoom_control_refs['in-on'].style.display = 'block';
    // zoom_control_refs['in-off'].style.display = 'none';
  }

  if (new_zoom <= 1) {
    if (new_zoom < 1) {
      // div_ref.fadeto(75,0.5);
      // div_ref.fadeto(75,1);
      fitBoth();
      resetPos();
      return;
    }
    // zoom_control_refs['out-on'].style.display = 'none';
    // zoom_control_refs['out-off'].style.display = 'block';
  } else {
    // zoom_control_refs['out-on'].style.display = 'block';
    // zoom_control_refs['out-off'].style.display = 'none';
  }

  zoom_level = new_zoom;

//--------------------------------------------------
// New width
  new_zoom_width = img_orig_width * new_zoom;
  new_zoom_height = img_orig_height * new_zoom;

  img_ref.width(new_zoom_width);
  img_ref.height(new_zoom_height);

//--------------------------------------------------
// Update position
  if (img_current_left === null) { // Position in the middle on page load
    img_current_left = (div_half_width - (new_zoom_width  / 2));
    img_current_top  = (div_half_height - (new_zoom_height / 2));
  } else {
    get_position();
    ratio = (new_zoom_width / img_zoom_width);

    img_current_left = (div_half_width - ((div_half_width - img_current_left) * ratio));
    img_current_top  = (div_half_height - ((div_half_height - img_current_top)  * ratio));
  }

  img_zoom_width = new_zoom_width;
  img_zoom_height = new_zoom_height;

  img_ref.offset({top: img_current_top, left: img_current_left});
}

function image_zoom_in() {
  image_zoom(0.5);
}

function image_zoom_out() {
  image_zoom(-0.5);
}

function scroll_event(e) {
  //--------------------------------------------------
  // Event
  e = e || window.event;
  var wheelData = (e.detail ? e.detail * -1 : e.wheelDelta / 40);
  image_zoom(wheelData > 0 ? 0.5 : -0.5);

  //--------------------------------------------------
  // Prevent default
  if (e.preventDefault) {
    e.preventDefault();
  } else {
    e.returnValue = false;
  }

  return false;
}

//--------------------------------------------------
// Movement
function event_coords(e) {
  var coords = [];
  if(e) {
    coords[0] = e.pageX;
    coords[1] = e.pageY;
  }
  return coords;
}
function get_position() {
  img_current_left = $("#image_display img").position().left;
  img_current_top = $("#image_display img").position().top;
}

function image_move_update() {
  //--------------------------------------------------
  // Boundary check
  var max_left = (div_half_width - img_zoom_width),
    max_top = (div_half_height - img_zoom_height);

  if (img_current_left > div_half_width)  { img_current_left = div_half_width; }
  if (img_current_top  > div_half_height) { img_current_top  = div_half_height; }
  if (img_current_left < max_left)        { img_current_left = max_left; }
  if (img_current_top  < max_top)         { img_current_top  = max_top;  }

  //--------------------------------------------------
  // Move
  img_ref.offset({top: img_current_top, left: img_current_left});
}

function image_move_event(e) {
  //--------------------------------------------------
  // Calculations
  var currentPos = event_coords(e);

  img_current_left = (img_start_left + (currentPos[0] - origin[0]));
  img_current_top = (img_start_top + (currentPos[1] - origin[1]));
  image_move_update();

  return false;
}

function image_move_start(e) {
  //--------------------------------------------------
  // Event
  // e.preventDefault();

  //--------------------------------------------------
  // Double tap/click event
  var now = new Date().getTime();
  if (click_last > (now - 200)) {
    image_zoom_in();
  } else {
    click_last = now;
  }

  //--------------------------------------------------
  // Add events
  $(document).mousemove(function(event) {
    image_move_event(event);
  });
  $(document).mouseup(function() {
    $(document).mousemove(function(){});
    $(document).mouseup(function(){});
  });

  //--------------------------------------------------
  // Record starting position
  img_start_left = img_current_left;
  img_start_top = img_current_top;

  origin = event_coords(e);
}

function addImageControls() { // Not DOM ready, as we need the image to have loaded
  div_ref = $('#image_display');
  img_ref = $('#image_display img');

  if (div_ref && img_ref) {

  //--------------------------------------------------
  // Variables
  var div_border,
    div_style,
    div_width,
    div_height,
    width,
    height,
    button,
    buttons,
    name,
    len,
    k;

  //--------------------------------------------------
  // Wrapper size
  div_half_width = div_ref.width();
  div_half_height = div_ref.height();
  
  div_half_width = Math.round(parseInt(div_half_width, 10) / 2);
  div_half_height = Math.round(parseInt(div_half_height, 10) / 2);

  //--------------------------------------------------
  // Original size
  img_orig_width = img_ref.width();
  img_orig_height = img_ref.height();

  // Zoom levels
  //--------------------------------------------------
  // Defaults
  div_width = (div_half_width * 2);
  div_height = (div_half_height * 2);

  width = img_orig_width;
  height = img_orig_height;

  zoom_levels[zoom_levels.length] = width;
  
  while (width > div_width || height > div_height) {
    width = (width * 0.75);
    height = (height * 0.75);
    zoom_levels[zoom_levels.length] = Math.round(width);
  }

  //--------------------------------------------------
  // Mobile phone, over zoom
    if (parseInt(div_border, 10) === 5) { // img width on webkit will return width before CSS is applied
      zoom_levels[zoom_levels.length] = Math.round(img_orig_width * 1.75);
      zoom_levels[zoom_levels.length] = Math.round(img_orig_width * 3);
    }

  //--------------------------------------------------
  // Add events
    img_ref.mousedown(image_move_start(event));

    document.onkeyup = function(e) {
      var keyCode = (e ? e.which : window.event.keyCode);
      if (keyCode === 37 || keyCode === 39) { // left or right
        //img_current_left = (img_current_left + (keyCode === 39 ? 50 : -50));
        //image_move_update();
      } else if (keyCode === 38 || keyCode === 40) { // up or down
        //img_current_top = (img_current_top + (keyCode === 40 ? 50 : -50));
        //image_move_update();
      } else if (keyCode === 107 || keyCode === 187 || keyCode === 61) { // + or = (http://www.javascripter.net/faq/keycodes.htm)
        image_zoom_in();
        console.log("Zoom in " + zoom_level);
      } else if (keyCode === 109 || keyCode === 189) { // - or _
        image_zoom_out();
        console.log("Zoom out " + zoom_level);
      }
    };
  }
};