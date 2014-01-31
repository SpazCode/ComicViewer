/*
Copyright 2012 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Author: Eric Bidelman (ericbidelman@chromium.org)
Updated: Joe Marini (joemarini@google.com)
*/

var chosenEntry = null;
var frame = document.querySelector('#frame');
var image = document.querySelector('#image');
var frstb = document.querySelector('#frstbtn');
var lastb = document.querySelector('#lastbtn');
var nextb = document.querySelector('#nextbtn');
var prevb = document.querySelector('#prevbtn');
var openb = document.querySelector('#openbtn');


function errorHandler(e) {
  console.error(e);
}

openb.addEventListener('click', function(e) {
  console.log("works");
  /*var accepts = [{
    mimeTypes: ['text/*'],
    extensions: ['zip', 'cbz', 'cbr']
  }];
  chrome.fileSystem.chooseEntry({type: 'openFile', accepts: accepts}, function(theEntry) {
    if (!theEntry) {
      alert('No file selected.');
      return;
    }
    // use local storage to retain access to this file
    chrome.storage.local.set({'chosenFile': chrome.fileSystem.retainEntry(theEntry)});
    loadFileEntry(theEntry);
  });*/
});