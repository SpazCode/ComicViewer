console.log("running\n");
console.log($('body').width());
console.log($(window).width());
// key codes
var Key = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40,
A: 65, B: 66, C: 67, D: 68, E: 69, F: 70, G: 71, H: 72, I: 73, J: 74, K: 75, L: 76, M: 77,
N: 78, O: 79, P: 80, Q: 81, R: 82, S: 83, T: 84, U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 9, 
EQUALS:187, ADD:107, UNDERSCORE:189, SUB:109};

// Settings object
var settings = {nextKey: 0, prevKey: 0, frstKey: 0, lastKey: 0, 
                openKey: 0, settingKey: 0, helpKey: 0, gotoKey: 0, 
                panReset: true, zoomReset: true};

// Settings Array of keys
var settingStrings = ["nextKey", "prevKey", "firstKey", "lastKey", "openKey", "settingKey", "helpKey", "gotoKey"];

//--------------------------------------------------
// Variables
// For loading and controling comics display
var images = [];
var done = 0;
var display = 1;
var dir;
var curPanel = 0;
var first = 0;
var last = images.length;
var displayMode = 0;
var currentZoomLevel = 1;
var loaded = false;
var intcnt = 0;

// Set the menu to be visible
$('#menubar').show();

// initilize settings on winow load
window.onload = function () { 
  init(); 
}

// Adapting the image size on window resize
$(window).resize(function() {
  drawPanel(curPanel);
});

//Generic error handler
function errorHandler(e) {
  console.log("*** ERROR ***");
  console.dir(e);
}

// Generic Setting handler for the app
function saveSettings() {
  chrome.storage.local.set(settings, function() {
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

function resetSettings() {
  if(settings.zoomReset) $('#image_display img').panzoom("resetZoom");
  if(settings.panReset) $('#image_display img').panzoom("resetPan");
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
  $(document).keyup(keyHandler);
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

// Drag and drop contols
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

// Handler for the interface to opening files
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
              var result = $.grep(images, function(e){ return e.name == f.filename; });

              if (result == 0) 
                images.push({name:f.filename, loaded:false, image:new ImageFile(f)});

              if (images.length > curPanel + 1)
                drawPanel(curPanel);
            }

          });
        unarchiver.addEventListener(bitjs.archive.UnarchiveEvent.Type.FINISH,
          function(e) {
            loaded = true;
            console.log("Done Extracting, Begin Saving");
          });
        unarchiver.start();
      } else {
        alert("Some error");
      }
    };
    fr.readAsArrayBuffer(file);
  }
}

// Creates the src for the images  in the comic viewer
var createURLFromArray = function(array, mimeType) {
  var offset = array.byteOffset, len = array.byteLength;
  var bb, url;
  var blob;
 // Blob constructor, see http://dev.w3.org/2006/webapi/FileAPI/#dfn-Blob.
  if (typeof Blob == 'function') {
    blob = new Blob([array], {type: mimeType});
  } else {
    var bb = (typeof BlobBuilder == 'function' ? (new BlobBuilder()) : //Chrome 8
               (typeof WebKitBlobBuilder == 'function' ? (new WebKitBlobBuilder()) : //Chrome 12
                 (typeof MozBlobBuilder == 'function' ? (new MozBlobBuilder()) : //Firefox 6
               null)));
    if (!bb) return false;
    bb.append(array.buffer);
    blob = bb.getBlob();
  }
  
  if (blob.webkitSlice) { //Chrome 12
    blob = blob.webkitSlice(offset, offset + len, mimeType);
  } else if(blob.mozSlice) { //Firefox 5
    blob = blob.mozSlice(offset, offset + len, mimeType);
  } else if(blob.slice) { //
    blob = blob.slice(2, 3).size == 1 ? 
      blob.slice(offset, offset + len, mimeType) : //future behavior
      blob.slice(offset, len, mimeType); //Old behavior
  }
  
  // TODO: Simplify this some time in 2013 (Chrome 8 and 9 are ancient history).
  var url = (typeof createObjectURL == 'function' ? createObjectURL(blob) : //Chrome 9?
              (typeof createBlobURL == 'function' ? createBlobURL(blob) : //Chrome 8
                (((typeof URL == 'object' || typeof URL == 'function') && typeof URL.createObjectURL == 'function') ? URL.createObjectURL(blob) : //Chrome 15? Firefox
                  (((typeof webkitURL == 'object' || typeof webkitURL == 'function') && typeof webkitURL.createObjectURL == 'function') ? webkitURL.createObjectURL(blob) : //Chrome 10
                    ''))));
  return url;
}

// Progress Model
/*function showProgress() {

}*/

// Gallery controls
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

// Helpscreen toggle
$('#helpbtn').click(function(e) {
  toggleHelp();
});

// Goto toggle
$('#gotobtn').click(function(e) {
  toggleGoto();
});

// Function to toggle the help screen
function toggleHelp() {
  // Toggle the helpscreen's visibility
  if($('#helpscreen').is(':hidden')) {
    $('#helpscreen').show();
  } else {
    $('#helpscreen').hide();
  }
}

function toggleGoto() {
  // Only toggle goto if the book is fully loaded 
  if (loaded) {
    // Toggle the goto input's visibility
    if($('#gotoscreen').is(':hidden')) {
      $('#gotoscreen').show();
      // Insert the input ui
      $('#gotoscreen').html('<input class="pagenumber" type="number" id="pagenumber" min="1" max="' + last + '"" maxlength="' + last.toString().length + '"> of ' + last + '<button type="button" class="btn btn-default btn-sm" id="pagesubmit">Go</button>');
      // Add function for the button 
      $('#pagesubmit').click(function(e) {
        // Get value 
        var page = $('#pagenumber').val();
        // Only accepts values between 1 and the last page
        if(page < images.length && page > 0) {
          drawPanel(parseInt(page) - 1);
          toggleGoto();
        } else {
          // Flash red when the number us invalid
          var intrv = setInterval(function(){
            intcnt++;
            $('#pagenumber').attr('disabled','disabled');
            if (intcnt == 1) {
              $('#pagenumber').css("background-color", "red");
            } else if (intcnt == 2) {
              $('#pagenumber').css("background-color", "white");
            } else if (intcnt == 2) {
              $('#pagenumber').css("background-color", "red");
            } else {
              $('#pagenumber').css("background-color", "white");
              intcnt = 0;
              $('#pagenumber').removeAttr('disabled');
              clearInterval(intrv);
            }
          },250);
        }
      });
    } else {
      // Remove and unbind
      $('#gotoscreen').hide();
      $('#pagesubmit').unbind("click");
    }
  }
}

// Goto the last page 
function lastPanel() {
  resetSettings();
  if(curPanel != last - display) drawPanel(images.length - 1);
  console.log(curPanel);
}

// Goto to the previous page
function prevPanel() {
  resetSettings();
  if(curPanel > first) drawPanel(curPanel - display);
  console.log(curPanel);
}

// Goto to the first page 
function frstPanel() {
  resetSettings();
  if(curPanel != first) drawPanel(first);
  console.log(curPanel);
}

function nextPanel() {
  resetSettings();
  if(curPanel+display < images.length) drawPanel(curPanel + display);
  console.log(curPanel);
}

function zoomon() {
  $('#image_display img').panzoom({
    $zoomIn    : $('#zoominbtn'),
    $zoomOut   : $('#zoomoutbtn'),
    $reset     : $("#resetbtn"),
    maxScale   : 4,
  });
}

// Draw image on the screen
function drawPanel(num) {
  curPanel = num;

  $("#page_count").each(function( index ) {
    if (num+index >= images.length || num+index < 0) {
      $(this).hide();
    } else {
      $(this).text((curPanel + 1) + "/" + (images.length));
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
        $(document).unbind("keyup", keyHandler);
        $(document).keyup(keyHandler);
        zoomon();
      }).attr("src",images[num+index].image.dataURI);
      $(this).show();
    }
  });
}

// Handler for keyboard controls 
function keyHandler(evt) {
  var code = evt.keyCode;
  if (code == Key.O) {
    openFile();
  }

  if (evt.ctrlKey || evt.shiftKey || evt.metaKey) return;
  switch(code) {
    case Key.LEFT:
      prevPanel();
      break;
    case Key.RIGHT:
      nextPanel();
      break;
    case Key.UP:
      $('#image_display img').panzoom("pan", 0, 25, {relative: true});
      break;
    case Key.DOWN:
      $('#image_display img').panzoom("pan", 0, -25, {relative: true});
      break;
    case Key.ADD:
      $('#zoominbtn').click();
      break;
    case Key.SUB:
      $('#zoomoutbtn').click();
      break;
    case Key.EQUALS:
      $('#zoominbtn').click();
      break;
    case Key.UNDERSCORE:
      $('#zoomoutbtn').click();
      break;
    case Key.R:
      $('#resetbtn').click();
      break;
    case Key.H:
      toggleHelp();
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
    case Key.Q:
      document.body.webkitRequestFullscreen();
      break;
    default:
      console.log("KeyCode = " + code);
      break;
  }
}

// Reset to defaults on reload
function reset() {
 //  resetPos();
  images = [];
  done = 0;
  display = 1;
  curPanel = 0;
  first = 0;
  last = images.length;
  loaded = false;
  drawPanel(curPanel);
  $('#frstbtn').click(null);
  $('#nextbtn').click(null);
  $('#prevbtn').click(null);
  $('#lastbtn').click(null);
  $('#zoominbtn').click(null);
  $('#zoomoutbtn').click(null);
  $("#image_display img").hide();
  $('#page_count').hide();
}

// Toggle the controlbar on and off 
function hideControls() {
  if($('#menubar').is(":visible")) $('#menubar').hide();
  else $('#menubar').show();
<<<<<<< HEAD
}
=======
}

// initialize settings on winow load
window.onload = init();

// Adapting the image size on window resize
$(window).resize(function() {
  drawPanel(curPanel);
});
>>>>>>> b7d10ed5f24d241a028f4316d9759e324f6f1cba
