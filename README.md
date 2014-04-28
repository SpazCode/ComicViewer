ComicViewer
===========

A simple Chrome app to view comics from your local storage. It should support cbr, cbz, zip, and rar

  /*// Set the script path
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

              console.log("Percent Loaded: " + perc);

              for(var i=0; i<images.length; i++) {
                if(images[i].path == file.toURL()) {
                  images[i].loaded = true;
                  break;
                }
              }

              // If all the images are loaded
              if(done == images.length) {
                last = images.length;
                spread(1);
              }
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
  });*/