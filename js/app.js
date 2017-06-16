'use strict';

var app = angular.module('comicviewer', [
    'ngMaterial',
    'ngBasicGallary'
]);

app.config(function($mdIconProvider) {
    $mdIconProvider
        .defaultIconSet('js/bower_components/material-design-icons/iconfont/MaterialIcons-Regular.svg', 24);
});

app.controller('MainCtrl', function($scope, $mdSidenav, $log) {
    $scope.images = [];
    $scope.file = null;
    $scope.gallaryMode = true;
    $scope.processing = 0;
    $scope.processingDone = false;
    $scope.zoomMax = 2.5;
    $scope.autoFit = true;

    $scope.openNav = function() {
        $mdSidenav("main").toggle().then(function() {
            $log.debug("toggle main nav");
        });
    };

    $scope.openFile = function() {
        console.log("Choose file\n");
        var accepts = [{
            extensions: ['zip', 'cbz', 'rar', 'cbr', 'tar']
        }];
        chrome.fileSystem.chooseEntry({ type: 'openFile', accepts: accepts }, function(theEntry) {
            if (!theEntry) {
                console.log("No Entry chosen\n");
                return;
            }
            // use local storage to retain access to this file
            chrome.storage.local.set({ 'chosenFile': chrome.fileSystem.retainEntry(theEntry) });
            // handleFile(theEntry);
            theEntry.file(function(file) {
                // reset();
                // handleFile(file);
                console.log(file);
                $scope.file = file;
                handleFile(file);
                $scope.openNav();
            });
        });
    }

    $scope.closeApp = function() {
        $log.debug("toggle main nav");
        window.close();
    }

    $scope.init = function() {
        initializeTempStorage();
    }

    // Create the space to store the images in memory
    var initializeTempStorage = function() {
        navigator.webkitTemporaryStorage.requestQuota(80 * 1024 * 1024, function(grantedBytes) {
            window.webkitRequestFileSystem(window.TEMPORARY, grantedBytes, function() {}, errorHandler);
        }, errorHandler);
    }

    //Generic error handler
    function errorHandler(e) {
        console.log("*** ERROR ***");
        console.dir(e);
    }

    // Load the files
    function handleFile(file) {
        // The images
        var images = [];

        // Creates the src for the images in the comic viewer
        var createURLFromArray = function(array, mimeType) {
            var offset = array.byteOffset,
                len = array.byteLength;
            var bb, url;
            var blob;
            // Blob constructor, see http://dev.w3.org/2006/webapi/FileAPI/#dfn-Blob.
            if (typeof Blob == 'function') {
                blob = new Blob([array], { type: mimeType });
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
            } else if (blob.mozSlice) { //Firefox 5
                blob = blob.mozSlice(offset, offset + len, mimeType);
            } else if (blob.slice) { //
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
        };

        /*
        Image Utility functions
        */
        var ImageFile = function(file) {
            this.filename = file.filename;
            var fileExtension = file.filename.split('.').pop().toLowerCase();
            var mimeType = fileExtension == 'png' ? 'image/png' :
                (fileExtension == 'jpg' || fileExtension == 'jpeg') ? 'image/jpeg' :
                fileExtension == 'gif' ? 'image/gif' : undefined;
            this.dataURI = createURLFromArray(file.fileData, mimeType);
            this.data = file;
        };

        if (true) {
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
                            $scope.processing = percentage;
                            // last = e.totalFilesInArchive;
                            // lastCompletion = percentage * 100;
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
                                // var result = $.grep(images, function(e) {
                                //     return e.name == f.filename; });

                                // if (result == 0)
                                images.push({ name: f.filename, loaded: false, image: new ImageFile(f) });
                            }

                        });
                    unarchiver.addEventListener(bitjs.archive.UnarchiveEvent.Type.FINISH,
                        function(e) {
                            console.log("Done Extracting, Begin Saving");
                            $scope.images = images;
                            $scope.toPage(0);
                            $scope.$apply();
                        });
                    unarchiver.start();
                } else {
                    alert("Some error");
                }
            };
            fr.readAsArrayBuffer(file);
        }
    }

});
