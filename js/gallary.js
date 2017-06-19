'use strict';

var app = angular.module('ngBasicGallary', ['ngMaterial']);

app.directive('imageGallary', function() {
    return {
        restrict: 'AE',
        replace: 'true',
        scope: {
            reset: '=',
            images: '=',
            fit: '=',
            next: '=',
            prev: '=',
            topage: '=',
            zoomin: '=',
            zoomout: '=',
            zoommax: '=',
            autofit: '='
        },
        controller: function($scope, $interval, $mdDialog) {
            // Data Variables
            $scope.canvas = $("#viewer").get(0);
            $scope.context = $scope.canvas.getContext("2d");
            $scope.mouse = { x: 0, y: 0 };
            $scope.startCoords = { x: 0, y: 0 };
            $scope.isDOwn = false;
            $scope.canvasBound = $scope.canvas.getBoundingClientRect();
            $scope.imageData = {
                image: new Image(),
                cX: 0,
                cY: 0,
                sX: 0,
                sY: 0,
                scale: 1
            };            
            $scope.curPage = 0;
            $scope.userInput = {};
            $scope.userInput.pageToGo = $scope.curPage;
            $scope.lastFrontImage = "";
            $scope.showPageCount = false;
            $scope.showGoToForm = false;

            // Functionality
            $scope.imageData.image.onload = function() {
                if ($scope.autofit) $scope.fit();
            }

            function render() {
                if ($scope.images.length > 0) $scope.showPageCount = true;
                else $scope.showPageCount = false;
                $scope.canvas.width = window.innerWidth;
                $scope.canvas.height = window.innerHeight;
                $scope.context.save();
                $scope.context.setTransform(1, 0, 0, 1, 0, 0);
                $scope.context.clearRect(0, 0, $scope.canvas.width, $scope.canvas.height);
                $scope.context.restore();
                if ($scope.images.length > 0) {
                    if ($scope.reset) {
                        $scope.reset = false;
                        $scope.imageData.image.src = $scope.images[$scope.curPage].image.dataURI;
                    }
                    $scope.context.drawImage(
                        $scope.imageData.image,
                        $scope.imageData.cX,
                        $scope.imageData.cY,
                        $scope.imageData.image.naturalWidth * $scope.imageData.scale,
                        $scope.imageData.image.naturalHeight * $scope.imageData.scale
                    );
                }
                $scope.context.restore();
            }
            $scope.loop = $interval(render);

            $scope.canvas.onmousemove = function(e) {
                "use strict";
                var xVal = e.pageX - $scope.canvasBound.left,
                    yVal = e.pageY - $scope.canvasBound.top;
                $scope.mouse = { x: xVal, y: yVal };
                if ($scope.isDown) {
                    $scope.imageData.cX = $scope.imageData.sX + ($scope.mouse.x - $scope.startCoords.x);
                    $scope.imageData.cY = $scope.imageData.sY + ($scope.mouse.y - $scope.startCoords.y);
                }
            };

            $scope.canvas.onmousedown = function(e) {
                "use strict";
                $scope.isDown = true;
                $scope.startCoords = {
                    x: e.pageX - $scope.canvasBound.left,
                    y: e.pageY - $scope.canvasBound.top
                };
            };

            $scope.canvas.onmouseup = function(e) {
                "use strict";
                $scope.isDown = false;
                $scope.imageData.sX = $scope.imageData.cX;
                $scope.imageData.sY = $scope.imageData.cY;
            };

            $scope.next = function() {
                if ($scope.curPage < $scope.images.length) {
                    $scope.curPage++;
                    $scope.imageData.image.src = $scope.images[$scope.curPage].image.dataURI;

                }
            }

            $scope.prev = function() {
                if ($scope.curPage > 0) {
                    $scope.curPage--;
                    $scope.imageData.image.src = $scope.images[$scope.curPage].image.dataURI;

                }
            }

            $scope.topage = function(page) {
                if (page < $scope.images.length && page >= 0) {
                    $scope.curPage = page;
                    $scope.imageData.image.src = $scope.images[$scope.curPage].image.dataURI;

                }
            }

            $scope.zoomin = function() {
                if ($scope.imageData.scale < $scope.zoommax) $scope.imageData.scale += 0.1;
            }

            $scope.zoomout = function() {
                if ($scope.imageData.scale > 0.1) $scope.imageData.scale -= 0.1;
            }

            $scope.fit = function() {
                // Scale the image to fit
                var xScale = $scope.canvas.clientWidth / $scope.imageData.image.naturalWidth,
                    yScale = $scope.canvas.clientHeight / $scope.imageData.image.naturalHeight;
                if (xScale < yScale) {
                    $scope.imageData.scale = xScale;
                } else {
                    $scope.imageData.scale = yScale;
                }

                // Centerfy the image
                var imgWidth = $scope.imageData.image.naturalWidth * $scope.imageData.scale,
                    imgHeight = $scope.imageData.image.naturalHeight * $scope.imageData.scale,
                    cX = $scope.canvas.clientWidth / 2 - imgWidth / 2,
                    cY = $scope.canvas.clientHeight / 2 - imgHeight / 2;
                $scope.imageData.cX = cX;
                $scope.imageData.cY = cY;
                $scope.imageData.sX = cX;
                $scope.imageData.sY = cY;
                render();
            }

            $scope.goToPageToogle = function() {
                $scope.showGoToForm = !$scope.showGoToForm;
                $scope.userInput.pageToGo = $scope.curPage + 1;
            }

            $scope.switchpage = function() {
                $scope.showGoToForm = false;
                console.log($scope.userInput.pageToGo);
                $scope.topage($scope.userInput.pageToGo - 1);
            }
        },
        template: `<div>
                     <div layout="row" class="menubar">
                        <button class="md-button fit-button md-ink-ripple" type="button" ng-click="prev()">
                            <i class="material-icons" style="font-size:48px;">chevron_left</i>
                        </button>
                        <button class="md-button fit-button md-ink-ripple" type="button" ng-click="zoomin()">
                            <i class="material-icons" style="font-size:48px;">zoom_in</i>
                        </button>
                        <button class="md-button fit-button md-ink-ripple" type="button" ng-click="fit()">
                            <i class="material-icons" style="font-size:48px;">aspect_ratio</i>
                        </button>
                        <button class="md-button fit-button md-ink-ripple" type="button" ng-click="zoomout()">
                            <i class="material-icons" style="font-size:48px;">zoom_out</i>
                        </button>
                        <button class="md-button fit-button md-ink-ripple" type="button" ng-click="next()">
                            <i class="material-icons" style="font-size:48px;">chevron_right</i>
                        </button>
                     </div>
                     <div layout="row" class="page-count" ng-if="showPageCount && !showGoToForm" ng-click="goToPageToogle()">
                        <md-tooltip md-direction="right">Click to GoTo Page</md-tooltip>
                        <strong> {{curPage+1}} / {{images.length}}</strong>
                     </div>
                     <div layout="row" class="page-count" ng-if="showPageCount && showGoToForm">
                        <strong>
                            <input type="number" step="1" name="rate" ng-model="userInput.pageToGo" min="1"
                            max="{{images.length}}"/>
                            / {{images.length}} 
                        <md-button class="md-icon-button md-primary" aria-label="Go" ng-click="switchpage()">
                            <i class="material-icons">launch</i>
                        </md-button>
                        </strong>
                     </div>
                     <canvas id="viewer" class="image-viewer"></canvas>
                   </div>
                `
    }
});
