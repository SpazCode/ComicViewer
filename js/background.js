chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('index.html', {
    'id':'ImageWin', 
	'bounds': {
		'width': 300,
		'height': 400
    }
  });
});

chrome.runtime.onInstalled.addListener(function() {
  // set up database
});

chrome.runtime.onSuspend.addListener(function() {
  // Close open connections
});