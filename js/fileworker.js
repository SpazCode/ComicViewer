//fileworker.js
self.requestFileSystemSync = self.webkitRequestFileSystemSync ||
                             self.requestFileSystemSync;

function onError(e) {
  postMessage('ERROR: ' + e.toString());
}

onmessage = function(e) {
  var data = e.data;

  // Make sure we have the right parameters.
  if (!data.fileName || !data.blob || !data.type) {
    return;
  }

  try {
    var fs = requestFileSystemSync(TEMPORARY, 20 * 1024 * 1024 /*1MB*/);

    postMessage('Got file system.');

    var fileEntry = fs.root.getFile(data.fileName, {create: true});

    postMessage('Got file entry.');

    var blob = new Blob(data.blob, {type: data.type});

    try {
      postMessage('Begin writing');
      fileEntry.createWriter().write(blob);
      postMessage('Writing complete');
      postMessage({url: fileEntry.toURL()});
    } catch (err) {
      onError(err);
    }

  } catch (err) {
    onError(err);
  }
};