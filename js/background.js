chrome.app.runtime.onLaunched.addListener(function() {
  var screenWidth = screen.availWidth;
  var screenHeight = screen.availHeight;
  var width = Math.floor(screenWidth*(7/8));
  var height = Math.floor(screenHeight*(7/8));
  chrome.app.window.create('index.html', {
    'id':'ImageWin',
    frame: 'chrome',
    width: width,
    height: height,
    minWidth: 400,
    minHeight: 600,
    left: Math.floor((screenWidth-width)/2),
    top: Math.floor((screenHeight-height)/2)
  });
});

chrome.runtime.onInstalled.addListener(function() {
  // set up database
});

chrome.runtime.onSuspend.addListener(function() {
  // Close open connections
});