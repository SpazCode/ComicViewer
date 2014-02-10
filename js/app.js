console.log("running\n");

var chosenEntry = null;
var frame = document.querySelector('#frame');
var image = document.querySelector('#image');
var frstb = document.querySelector('#frstbtn');
var lastb = document.querySelector('#lastbtn');
var nextb = document.querySelector('#nextbtn');
var prevb = document.querySelector('#prevbtn');
var openb = document.getElementById("openbtn");
var images = [];
var done = 0;
var dir;
var curPanel;

// key codes
var Key = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, 
A: 65, B: 66, C: 67, D: 68, E: 69, F: 70, G: 71, H: 72, I: 73, J: 74, K: 75, L: 76, M: 77, 
N: 78, O: 79, P: 80, Q: 81, R: 82, S: 83, T: 84, U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90};


function errorHandler(e) {
  console.error(e);
}

$(document).on("drop", dropHandler);


$('#openbtn').click( function() {
  console.log("Choose file\n");
  var accepts = [{
    extensions: ['zip', 'cbz', 'cbr', 'txt']
  }];
  chrome.fileSystem.chooseEntry({type: 'openFile', accepts: accepts}, function(theEntry) {
    if (!theEntry) {
      console.log("No Entry chosen\n");
      return;
    }
    // use local storage to retain access to this file
    chrome.storage.local.set({'chosenFile': chrome.fileSystem.retainEntry(theEntry)});
    theEntry.file(function(file) {
         handleFile(file); 
    });
  });
});

function init() {	
	window.webkitStorageInfo.requestQuota(window.TEMPORARY, 20*1024*1024, function(grantedBytes) {
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

function handleFile(file) {
	zip.workerScriptsPath = "lib/";

	zip.createReader(new zip.BlobReader(file), function(reader) {
		console.log("did create reader");
	    reader.getEntries(function(entries) {
	    	console.log("got entries");

	        entries.forEach(function(entry) {
	        	if(!entry.directory && entry.filename.indexOf(".jpg") != -1) {
	        		//rewrite w/o a path
	        		var cleanName = entry.filename;
	        		if(cleanName.indexOf("/") >= 0) cleanName = cleanName.split("/").pop();
					dir.getFile(cleanName, {create:true}, function(file) {
						console.log("Yes, I opened "+file.fullPath);
		        		images.push({path:file.toURL(), loaded:false})
						entry.getData(new zip.FileWriter(file), function(e) {

							done++;
							var perc = Math.floor(done/images.length*100);
							var pString = 'Processing images.';
							pString += '<div class="progress progress-striped active">';
							pString += '<div class="bar" style="width: '+perc+'%;"></div>';
							pString += '</div>';
							$("#alert").html(pString);

							for(var i=0; i<images.length; i++) {
								if(images[i].path == file.toURL()) {
									images[i].loaded = true; 
									break;
								}								
							}

							if(done == images.length) {
								//enable buttons
								$("#prevbtn").on("click",prevPanel);
								$("#nextbtn").on("click",nextPanel);
								drawPanel(0);
							}
						});

					},errorHandler);

		        }
	        },errorHandler);
	    },errorHandler);
	}, function(err) {
		doError("Sorry, but unable to read this as a CBR file.");
	    console.dir(err);
	});

}

function drawPanel(num) {
	curPanel = num;
	$("#image").attr("src",images[num].path);
	$("#page_count").html("Panel "+(curPanel+1)+" out of "+images.length);
}

function prevPanel() {
	if(curPanel > 0) drawPanel(curPanel-1);
}

function nextPanel() {
	if(curPanel+1 < images.length) drawPanel(curPanel+1);
}