'use strict';

var app = angular.module('ngBasicGallary', 
    ['ngAnimate']
);

app.directive('ng-gallary', function() {
    return {
        template: ` <div>
                        <canvas></canvas>
                    </div>
                  `;
    }
});