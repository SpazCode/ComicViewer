console.log("running\n");

var images = [];
var done = 0;
var display = 1;
var dir;
var curPanel = 0;


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

$('#openbtn').click( function(e) {
  e.preventDefault();
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
      reset;
      handleFile(file);
    });
  });
});

function handleFile(file) {
  console.log(file);
  zip.workerScriptsPath = "js/";

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
            images.push({path:file.toURL(), loaded:false})
  
            /*entry.getData(new zip.FileWriter(file), function(e) {
              done++;
              var perc = Math.floor((done/images.length)*100);

              for(var i=0; i<images.length; i++) {
                if(images[i].path == file.toURL()) {
                  images[i].loaded = true;
                  break;
                }
              }

              if(done == images.length) loaded;
              else showProgress(images.length);
            }, errorHandler);*/
          }, errorHandler);
          loaded()
        }
      });
    });
  }, function(err) {
    console.dir(err);
  });
}

function loaded() {
  drawPanel(curPanel);
}

function showProgress() {

}

function prevPanel() {
  if(curPanel > 0) drawPanel(curPanel-display);
}

function nextPanel() {
  if(curPanel+display < images.length) drawPanel(curPanel+display);
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
}

function reset() {
  var images = [];
  var done = 0;
  var display = 1;
  var dir;
  var curPanel = 0;
}

window.onload = init();