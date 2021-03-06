'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var QrScanner = function () {
    function QrScanner(type, video, onDecode, onError) {
        var _this = this;

        var canvasSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : QrScanner.DEFAULT_CANVAS_SIZE;

        _classCallCheck(this, QrScanner);

        this._qrWorker = new Worker((window.URL ? URL : webkitURL).createObjectURL(
                new Blob([QrScanner.WORKER_QR_SCANNER_CODE], { type: "text/javascript" })));

        if (type === "file"){
            QrScanner.scanImage(video)
                .then(result => onDecode(result))
                .catch(error => onError());
            return;
        }

        this.$video = video;
        this.$canvas = document.createElement('canvas');
        this._onDecode = onDecode;
        this._active = false;

        this.$canvas.width = QrScanner.DEFAULT_CANVAS_SIZE;
        this.$canvas.height = QrScanner.DEFAULT_CANVAS_SIZE;
        this._sourceRect = {
            x: 0,
            y: 0,
            width: canvasSize,
            height: canvasSize
        };

        this.$video.addEventListener('canplay', function () {
            return _this._updateSourceRect();
        });
        this.$video.addEventListener('play', function () {
            _this._updateSourceRect();
            _this._scanFrame();
        }, false);

    }

    _createClass(QrScanner, [{
        key: '_updateSourceRect',
        value: function _updateSourceRect() {
            var smallestDimension = Math.min(this.$video.videoWidth, this.$video.videoHeight);
            var sourceRectSize = Math.round(smallestDimension);
            this._sourceRect.width = this._sourceRect.height = sourceRectSize;
            this._sourceRect.x = (this.$video.videoWidth - sourceRectSize) / 2;
            this._sourceRect.y = (this.$video.videoHeight - sourceRectSize) / 2;
        }
    }, {
        key: '_scanFrame',
        value: function _scanFrame() {
            var _this2 = this;

            if (this.$video.paused || this.$video.ended) return false;
            requestAnimationFrame(function () {
                QrScanner.scanImage(_this2.$video, _this2._sourceRect, _this2._qrWorker, _this2.$canvas, true).then(_this2._onDecode, function (error) {
                    if (error !== 'QR code not found.') {
                        console.error(error);
                    }
                }).then(function () {
                    return _this2._scanFrame();
                });
            });
        }
    }, {
        key: '_getCameraStream',
        value: function _getCameraStream(facingMode) {
            var exact = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

            var constraintsToTry = [{
                width: { min: 1024 }
            }, {
                width: { min: 768 }
            }, {}];

            if (facingMode) {
                if (exact) {
                    facingMode = { exact: facingMode };
                }
                constraintsToTry.forEach(function (constraint) {
                    return constraint.facingMode = facingMode;
                });
            }
            return this._getMatchingCameraStream(constraintsToTry);
        }
    }, {
        key: '_getMatchingCameraStream',
        value: function _getMatchingCameraStream(constraintsToTry) {
            var _this3 = this;

            if (constraintsToTry.length === 0) {
                return Promise.reject('Camera not found.');
            }
            return navigator.mediaDevices.getUserMedia({
                video: constraintsToTry.shift()
            }).catch(function () {
                return _this3._getMatchingCameraStream(constraintsToTry);
            });
        }
    },  {
        key: 'makePicture',
        value: function makePicture() {
            var canvas = document.createElement("canvas"),
                context = canvas.getContext('2d');

            var width = this.$video.videoWidth,
                height = this.$video.videoHeight;

            if (width && height) {

                // Setup a canvas with the same dimensions as the video.
                canvas.width = width;
                canvas.height = height;

                // Make a copy of the current frame in the video on the canvas.
                context.drawImage(this.$video, 0, 0, width, height);

                // Turn the canvas image into a dataURL that can be used as a src for our photo.
                return canvas.toDataURL('image/png');
            }
        }
    },  {
        key: 'start',
        value: function start() {
            var _this4 = this;

            if (this._active) {
                return Promise.resolve();
            }
            this._active = true;
            clearTimeout(this._offTimeout);
            var facingMode = 'environment';
            return this._getCameraStream('environment', true).catch(function () {
                // we (probably) don't have an environment camera
                facingMode = 'user';
                return _this4._getCameraStream(); // throws if we can't access the camera
            }).then(function (stream) {
                _this4.$video.srcObject = stream;
                //_this4._setVideoMirror(facingMode);
            }).catch(function (e) {
                _this4._active = false;
                throw e;
            });
        }
    }, {
        key: 'stop',
        value: function stop() {
            var _this5 = this;

            if (!this._active) {
                return;
            }
            this._active = false;
            this.$video.pause();
            this._offTimeout = setTimeout(function () {
                _this5.$video.srcObject.getTracks()[0].stop();
                _this5.$video.srcObject = null;
            }, 3000);
        }
    }, {
        key: '_setVideoMirror',
        value: function _setVideoMirror(facingMode) {
            // in user facing mode mirror the video to make it easier for the user to position the QR code
            var scaleFactor = facingMode === 'user' ? -1 : 1;
            this.$video.style.transform = 'scaleX(' + scaleFactor + ')';
        }
    }, {
        key: 'setGrayscaleWeights',
        value: function setGrayscaleWeights(red, green, blue) {
            this._qrWorker.postMessage({
                type: 'grayscaleWeights',
                data: { red: red, green: green, blue: blue }
            });
        }

        /* async */

    }], [{
        key: 'scanImage',
        value: function scanImage(imageOrFileOrUrl) {
            var sourceRect = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
            var worker = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
            var canvas = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
            var fixedCanvasSize = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
            var alsoTryWithoutSourceRect = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : false;

            var promise = new Promise(function (resolve, reject) {
                worker = worker || new Worker((window.URL ? URL : webkitURL).createObjectURL(
                        new Blob([QrScanner.WORKER_QR_SCANNER_CODE], { type: "text/javascript" })));
                var timeout = void 0,
                    _onMessage = void 0,
                    _onError = void 0;
                _onMessage = function onMessage(event) {
                    if (event.data.type !== 'qrResult') {
                        return;
                    }
                    worker.removeEventListener('message', _onMessage);
                    worker.removeEventListener('error', _onError);
                    clearTimeout(timeout);
                    if (event.data.data !== null) {
                        resolve(event.data.data);
                    } else {
                        reject('QR code not found.');
                    }
                };
                _onError = function onError() {
                    worker.removeEventListener('message', _onMessage);
                    worker.removeEventListener('error', _onError);
                    clearTimeout(timeout);
                    reject('Worker error.');
                };
                worker.addEventListener('message', _onMessage);
                worker.addEventListener('error', _onError);
                timeout = setTimeout(_onError, 3000);
                QrScanner._loadImage(imageOrFileOrUrl).then(function (image) {
                    var imageData = QrScanner._getImageData(image, sourceRect, canvas, fixedCanvasSize);
                    worker.postMessage({
                        type: 'decode',
                        data: imageData
                    }, [imageData.data.buffer]);
                }).catch(reject);
            });

            if (sourceRect && alsoTryWithoutSourceRect) {
                return promise.catch(function () {
                    return QrScanner.scanImage(imageOrFileOrUrl, null, worker, canvas, fixedCanvasSize);
                });
            } else {
                return promise;
            }
        }

        /* async */

    }, {
        key: '_getImageData',
        value: function _getImageData(image) {
            var sourceRect = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
            var canvas = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
            var fixedCanvasSize = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

            canvas = canvas || document.createElement('canvas');
            var sourceRectX = sourceRect && sourceRect.x ? sourceRect.x : 0;
            var sourceRectY = sourceRect && sourceRect.y ? sourceRect.y : 0;
            var sourceRectWidth = sourceRect && sourceRect.width ? sourceRect.width : image.width || image.videoWidth;
            var sourceRectHeight = sourceRect && sourceRect.height ? sourceRect.height : image.height || image.videoHeight;
            if (!fixedCanvasSize && (canvas.width !== sourceRectWidth || canvas.height !== sourceRectHeight)) {
                canvas.width = sourceRectWidth;
                canvas.height = sourceRectHeight;
            }
            var context = canvas.getContext('2d', { alpha: false });
            context.imageSmoothingEnabled = false; // gives less blurry images
            context.drawImage(image, sourceRectX, sourceRectY, sourceRectWidth, sourceRectHeight, 0, 0, canvas.width, canvas.height);

            return context.getImageData(0, 0, canvas.width, canvas.height);
        }

        /* async */

    }, {
        key: '_loadImage',
        value: function _loadImage(imageOrFileOrUrl) {
            if (imageOrFileOrUrl instanceof HTMLCanvasElement || imageOrFileOrUrl instanceof HTMLVideoElement || window.ImageBitmap && imageOrFileOrUrl instanceof window.ImageBitmap || window.OffscreenCanvas && imageOrFileOrUrl instanceof window.OffscreenCanvas) {
                return Promise.resolve(imageOrFileOrUrl);
            } else if (imageOrFileOrUrl instanceof Image) {
                return QrScanner._awaitImageLoad(imageOrFileOrUrl).then(function () {
                    return imageOrFileOrUrl;
                });
            } else if (imageOrFileOrUrl instanceof File || imageOrFileOrUrl instanceof URL || typeof imageOrFileOrUrl === 'string') {
                var image = new Image();
                if (imageOrFileOrUrl instanceof File) {
                    image.src = URL.createObjectURL(imageOrFileOrUrl);
                } else {
                    image.src = imageOrFileOrUrl;
                }
                return QrScanner._awaitImageLoad(image).then(function () {
                    if (imageOrFileOrUrl instanceof File) {
                        URL.revokeObjectURL(image.src);
                    }
                    return image;
                });
            } else {
                return Promise.reject('Unsupported image type.');
            }
        }

        /* async */

    }, {
        key: '_awaitImageLoad',
        value: function _awaitImageLoad(image) {
            return new Promise(function (resolve, reject) {
                if (image.complete && image.naturalWidth !== 0) {
                    // already loaded
                    resolve();
                } else {
                    var _onLoad = void 0,
                        _onError2 = void 0;
                    _onLoad = function onLoad() {
                        image.removeEventListener('load', _onLoad);
                        image.removeEventListener('error', _onError2);
                        resolve();
                    };
                    _onError2 = function onError() {
                        image.removeEventListener('load', _onLoad);
                        image.removeEventListener('error', _onError2);
                        reject('Image load error');
                    };
                    image.addEventListener('load', _onLoad);
                    image.addEventListener('error', _onError2);
                }
            });
        }
    }]);

    return QrScanner;
}();


QrScanner.DEFAULT_CANVAS_SIZE = 600;
QrScanner.WORKER_QR_SCANNER_CODE = `(function(){
'use strict';var aa="function"==typeof Object.defineProperties?Object.defineProperty:function(d,c,a){d!=Array.prototype&&d!=Object.prototype&&(d[c]=a.value)},e="undefined"!=typeof window&&window===this?this:"undefined"!=typeof global&&null!=global?global:this;function ba(){ba=function(){};e.Symbol||(e.Symbol=da)}var da=function(){var d=0;return function(c){return"jscomp_symbol_"+(c||"")+d++}}();
function sa(){ba();var d=e.Symbol.iterator;d||(d=e.Symbol.iterator=e.Symbol("iterator"));"function"!=typeof Array.prototype[d]&&aa(Array.prototype,d,{configurable:!0,writable:!0,value:function(){return ta(this)}});sa=function(){}}function ta(d){var c=0;return ua(function(){return c<d.length?{done:!1,value:d[c++]}:{done:!0}})}function ua(d){sa();d={next:d};d[e.Symbol.iterator]=function(){return this};return d}function va(d){sa();ba();sa();var c=d[Symbol.iterator];return c?c.call(d):ta(d)}
function Oa(d,c){if(c){var a=e;d=d.split(".");for(var b=0;b<d.length-1;b++){var g=d[b];g in a||(a[g]={});a=a[g]}d=d[d.length-1];b=a[d];c=c(b);c!=b&&null!=c&&aa(a,d,{configurable:!0,writable:!0,value:c})}}
Oa("String.prototype.startsWith",function(d){return d?d:function(c,a){if(null==this)throw new TypeError("The 'this' value for String.prototype.startsWith must not be null or undefined");if(c instanceof RegExp)throw new TypeError("First argument to String.prototype.startsWith must not be a regular expression");var b=this+"";c+="";var g=b.length,d=c.length;a=Math.max(0,Math.min(a|0,b.length));for(var h=0;h<d&&a<g;)if(b[a++]!=c[h++])return!1;return h>=d}});
Oa("Array.prototype.find",function(d){return d?d:function(c,a){a:{var b=this;b instanceof String&&(b=String(b));for(var g=b.length,d=0;d<g;d++){var h=b[d];if(c.call(a,h,d,b)){c=h;break a}}c=void 0}return c}});
self.onmessage=function(d){var c=d.data.data;switch(d.data.type){case "setDebug":Pa=c;break;case "decode":var a=null;try{Qa=c;f=c.width;n=c.height;var b=Qa.data,g=0,k=new Uint8ClampedArray(b.buffer,g,f*n);g+=f*n;var h=new Uint8ClampedArray(b.buffer,g,f*n);g+=f*n;var l=va(Ra(f,n));l.next();for(var m=l.next().value,p=l.next().value,w=new Uint8ClampedArray(b.buffer,g,m*p),q=f,u=n,t=0;t<u;t++)for(var x=0;x<q;x++){var v=t*q+x,ca=4*v;k[v]=Sa.red*b[ca]+Sa.blue*b[ca+1]+Sa.green*b[ca+2]+128>>8}var ea=h,Q=
w,R=f,E=n;ea=void 0===ea?k:ea;Q=void 0===Q?null:Q;var S=va(Ra(R,E)),z=S.next().value,C=S.next().value,X=S.next().value;if(Q){if(!(Q instanceof Uint8ClampedArray)||Q.byteLength!==C*X)throw Error("QR Error: Illegal Buffer.");var Y=Q}else Y=new Uint8ClampedArray(C*X);for(var U=0;U<X;++U)for(var V=0;V<C;++V){for(var M=255,Z=0,Va=Math.min(U*z,E-z)*R+Math.min(V*z,R-z),Wa=0;Wa<z;++Wa){for(var wa=0;wa<z;++wa){var fa=k[Va+wa];fa<M&&(M=fa);fa>Z&&(Z=fa)}Va+=R}if(Z-M>Ta){var Xa=(M+Z)/2;var xa=Math.min(255,Xa+
(M+Z)/4,1.1*Xa)}else if(0===V||0===U)xa=M-1;else{var ya=U*C+V,Ya=(Y[ya-1]+Y[ya-C]+C[ya-C-1])/3;xa=Ya>M?Ya:M-1}Y[U*C+V]=xa}for(var ha=0;ha<X;++ha)for(var ia=0;ia<C;++ia){for(var Za=0,za=-2;2>=za;++za)for(var Aa=-2;2>=Aa;++Aa)Za+=Y[Math.max(0,Math.min(X-1,ha+Aa))*C+Math.max(0,Math.min(C-1,ia+za))];var $a=k,Ba=R,Kb=Za/25,ja=ea;ja=void 0===ja?$a:ja;for(var ab=Math.min(ha*z,E-z)*Ba+Math.min(ia*z,Ba-z),bb=0;bb<z;++bb){for(var Ca=0;Ca<z;++Ca){var cb=ab+Ca;ja[cb]=$a[cb]<=Kb}ab+=Ba}}if(Pa){var F=new ImageData(new Uint8ClampedArray(f*
n*4),f,n);for(var G=0;G<n;G++)for(var H=0;H<f;H++){var N=4*H+G*f*4,Da=h[G*f+H]?0:255;F.data[N]=Da;F.data[N+1]=Da;F.data[N+2]=Da;F.data[N+3]=255}}try{var ka=(new Ua(h)).Oa();if(Pa)for(G=0;G<ka.i.height;G++)for(H=0;H<ka.i.width;H++){N=8*H+2*G*f*4;var db=ka.i.ga(H,G);F.data[N]=db?0:255;F.data[N+1]=db?0:255;F.data[N+2]=255}}finally{Pa&&self.postMessage({type:"debugImage",data:F},[F.data.buffer])}var Ea=new tb(ka.i),Fa=Ea.Ba(),eb=Ea.Aa().Pa,la=Ea.jb();if(la.length!=Fa.na)throw Error("QR Error: ArgumentException");
for(var Ga=Fa.Za(eb),fb=0,ma=Ga.da,B=0;B<ma.length;B++)fb+=ma[B].count;for(var D=Array(fb),na=0,A=0;A<ma.length;A++){var gb=ma[A];for(B=0;B<gb.count;B++){var hb=gb.ra,Nb=Ga.ka+hb;D[na++]=new ub(hb,Array(Nb))}}for(var ib=D[0].T.length,W=D.length-1;0<=W&&D[W].T.length!=ib;)W--;W++;var Ha=ib-Ga.ka,Ia=0;for(B=0;B<Ha;B++)for(A=0;A<na;A++)D[A].T[B]=la[Ia++];for(A=W;A<na;A++)D[A].T[Ha]=la[Ia++];var Pb=D[0].T.length;for(B=Ha;B<Pb;B++)for(A=0;A<na;A++)D[A].T[A<W?B:B+1]=la[Ia++];for(var jb=0,T=0;T<D.length;T++)jb+=
D[T].ya;for(var kb=Array(jb),Qb=0,Ja=0;Ja<D.length;Ja++){for(var lb=D[Ja],mb=lb.T,nb=lb.ya,oa=mb,ob=nb,pb=oa.length,Ka=Array(pb),I=0;I<pb;I++)Ka[I]=oa[I]&255;var Rb=oa.length-ob;try{vb.decode(Ka,Rb)}catch(J){throw J;}for(I=0;I<ob;I++)oa[I]=Ka[I];for(T=0;T<nb;T++)kb[Qb++]=mb[T]}for(var La=(new wb(kb,Fa.oa,eb.i)).Xa(),qb="",pa=0;pa<La.length;pa++)for(var Ma=0;Ma<La[pa].length;Ma++)qb+=String.fromCharCode(La[pa][Ma]);var qa=qb;try{new URL(qa);var rb=!0}catch(J){rb=!1}if(rb){var ra="";try{ra=escape(qa)}catch(J){console.log(J),
ra=qa}var Na="";try{Na=decodeURIComponent(ra)}catch(J){console.log(J),Na=ra}var sb=Na}else sb=qa;a=xb=sb}catch(J){if(!J.message.startsWith("QR Error"))throw J;}finally{self.postMessage({type:"qrResult",data:a})}break;case "grayscaleWeights":if(256!==c.red+c.green+c.blue)throw Error("Weights have to sum up to 256");Sa=c}};function Ra(d,c){var a=Math.max(Math.floor(Math.min(d,c)/yb),zb);return[a,Math.ceil(d/a),Math.ceil(c/a)]}var yb=40,zb=16,Ta=12;function r(d,c){this.count=d;this.ra=c}function y(d,c,a){this.ka=d;this.da=a?[c,a]:Array(c)}
function K(d,c,a,b,g,k){this.oa=d;this.ca=c;this.da=[a,b,g,k];d=0;c=a.ka;a=a.da;for(b=0;b<a.length;b++)g=a[b],d+=g.count*(g.ra+c);this.na=d;this.fa=function(){return 17+4*this.oa};this.Ia=function(){var b=this.fa(),a=new Ab(b);a.P(0,0,9,9);a.P(b-8,0,8,9);a.P(0,b-8,9,8);for(var g=this.ca.length,c=0;c<g;c++)for(var d=this.ca[c]-2,k=0;k<g;k++)0==c&&(0==k||k==g-1)||c==g-1&&0==k||a.P(this.ca[k]-2,d,5,5);a.P(6,9,1,b-17);a.P(9,6,b-17,1);6<this.oa&&(a.P(b-11,0,3,6),a.P(0,b-11,6,3));return a};this.Za=function(b){return this.da[b.gb]}}
var Bb=[31892,34236,39577,42195,48118,51042,55367,58893,63784,68472,70749,76311,79154,84390,87683,92361,96236,102084,102881,110507,110734,117786,119615,126325,127568,133589,136944,141498,145311,150283,152622,158308,161089,167017],Cb=[new K(1,[],new y(7,new r(1,19)),new y(10,new r(1,16)),new y(13,new r(1,13)),new y(17,new r(1,9))),new K(2,[6,18],new y(10,new r(1,34)),new y(16,new r(1,28)),new y(22,new r(1,22)),new y(28,new r(1,16))),new K(3,[6,22],new y(15,new r(1,55)),new y(26,new r(1,44)),new y(18,
new r(2,17)),new y(22,new r(2,13))),new K(4,[6,26],new y(20,new r(1,80)),new y(18,new r(2,32)),new y(26,new r(2,24)),new y(16,new r(4,9))),new K(5,[6,30],new y(26,new r(1,108)),new y(24,new r(2,43)),new y(18,new r(2,15),new r(2,16)),new y(22,new r(2,11),new r(2,12))),new K(6,[6,34],new y(18,new r(2,68)),new y(16,new r(4,27)),new y(24,new r(4,19)),new y(28,new r(4,15))),new K(7,[6,22,38],new y(20,new r(2,78)),new y(18,new r(4,31)),new y(18,new r(2,14),new r(4,15)),new y(26,new r(4,13),new r(1,14))),
new K(8,[6,24,42],new y(24,new r(2,97)),new y(22,new r(2,38),new r(2,39)),new y(22,new r(4,18),new r(2,19)),new y(26,new r(4,14),new r(2,15))),new K(9,[6,26,46],new y(30,new r(2,116)),new y(22,new r(3,36),new r(2,37)),new y(20,new r(4,16),new r(4,17)),new y(24,new r(4,12),new r(4,13))),new K(10,[6,28,50],new y(18,new r(2,68),new r(2,69)),new y(26,new r(4,43),new r(1,44)),new y(24,new r(6,19),new r(2,20)),new y(28,new r(6,15),new r(2,16))),new K(11,[6,30,54],new y(20,new r(4,81)),new y(30,new r(1,
50),new r(4,51)),new y(28,new r(4,22),new r(4,23)),new y(24,new r(3,12),new r(8,13))),new K(12,[6,32,58],new y(24,new r(2,92),new r(2,93)),new y(22,new r(6,36),new r(2,37)),new y(26,new r(4,20),new r(6,21)),new y(28,new r(7,14),new r(4,15))),new K(13,[6,34,62],new y(26,new r(4,107)),new y(22,new r(8,37),new r(1,38)),new y(24,new r(8,20),new r(4,21)),new y(22,new r(12,11),new r(4,12))),new K(14,[6,26,46,66],new y(30,new r(3,115),new r(1,116)),new y(24,new r(4,40),new r(5,41)),new y(20,new r(11,16),
new r(5,17)),new y(24,new r(11,12),new r(5,13))),new K(15,[6,26,48,70],new y(22,new r(5,87),new r(1,88)),new y(24,new r(5,41),new r(5,42)),new y(30,new r(5,24),new r(7,25)),new y(24,new r(11,12),new r(7,13))),new K(16,[6,26,50,74],new y(24,new r(5,98),new r(1,99)),new y(28,new r(7,45),new r(3,46)),new y(24,new r(15,19),new r(2,20)),new y(30,new r(3,15),new r(13,16))),new K(17,[6,30,54,78],new y(28,new r(1,107),new r(5,108)),new y(28,new r(10,46),new r(1,47)),new y(28,new r(1,22),new r(15,23)),new y(28,
new r(2,14),new r(17,15))),new K(18,[6,30,56,82],new y(30,new r(5,120),new r(1,121)),new y(26,new r(9,43),new r(4,44)),new y(28,new r(17,22),new r(1,23)),new y(28,new r(2,14),new r(19,15))),new K(19,[6,30,58,86],new y(28,new r(3,113),new r(4,114)),new y(26,new r(3,44),new r(11,45)),new y(26,new r(17,21),new r(4,22)),new y(26,new r(9,13),new r(16,14))),new K(20,[6,34,62,90],new y(28,new r(3,107),new r(5,108)),new y(26,new r(3,41),new r(13,42)),new y(30,new r(15,24),new r(5,25)),new y(28,new r(15,15),
new r(10,16))),new K(21,[6,28,50,72,94],new y(28,new r(4,116),new r(4,117)),new y(26,new r(17,42)),new y(28,new r(17,22),new r(6,23)),new y(30,new r(19,16),new r(6,17))),new K(22,[6,26,50,74,98],new y(28,new r(2,111),new r(7,112)),new y(28,new r(17,46)),new y(30,new r(7,24),new r(16,25)),new y(24,new r(34,13))),new K(23,[6,30,54,74,102],new y(30,new r(4,121),new r(5,122)),new y(28,new r(4,47),new r(14,48)),new y(30,new r(11,24),new r(14,25)),new y(30,new r(16,15),new r(14,16))),new K(24,[6,28,54,
80,106],new y(30,new r(6,117),new r(4,118)),new y(28,new r(6,45),new r(14,46)),new y(30,new r(11,24),new r(16,25)),new y(30,new r(30,16),new r(2,17))),new K(25,[6,32,58,84,110],new y(26,new r(8,106),new r(4,107)),new y(28,new r(8,47),new r(13,48)),new y(30,new r(7,24),new r(22,25)),new y(30,new r(22,15),new r(13,16))),new K(26,[6,30,58,86,114],new y(28,new r(10,114),new r(2,115)),new y(28,new r(19,46),new r(4,47)),new y(28,new r(28,22),new r(6,23)),new y(30,new r(33,16),new r(4,17))),new K(27,[6,
34,62,90,118],new y(30,new r(8,122),new r(4,123)),new y(28,new r(22,45),new r(3,46)),new y(30,new r(8,23),new r(26,24)),new y(30,new r(12,15),new r(28,16))),new K(28,[6,26,50,74,98,122],new y(30,new r(3,117),new r(10,118)),new y(28,new r(3,45),new r(23,46)),new y(30,new r(4,24),new r(31,25)),new y(30,new r(11,15),new r(31,16))),new K(29,[6,30,54,78,102,126],new y(30,new r(7,116),new r(7,117)),new y(28,new r(21,45),new r(7,46)),new y(30,new r(1,23),new r(37,24)),new y(30,new r(19,15),new r(26,16))),
new K(30,[6,26,52,78,104,130],new y(30,new r(5,115),new r(10,116)),new y(28,new r(19,47),new r(10,48)),new y(30,new r(15,24),new r(25,25)),new y(30,new r(23,15),new r(25,16))),new K(31,[6,30,56,82,108,134],new y(30,new r(13,115),new r(3,116)),new y(28,new r(2,46),new r(29,47)),new y(30,new r(42,24),new r(1,25)),new y(30,new r(23,15),new r(28,16))),new K(32,[6,34,60,86,112,138],new y(30,new r(17,115)),new y(28,new r(10,46),new r(23,47)),new y(30,new r(10,24),new r(35,25)),new y(30,new r(19,15),new r(35,
16))),new K(33,[6,30,58,86,114,142],new y(30,new r(17,115),new r(1,116)),new y(28,new r(14,46),new r(21,47)),new y(30,new r(29,24),new r(19,25)),new y(30,new r(11,15),new r(46,16))),new K(34,[6,34,62,90,118,146],new y(30,new r(13,115),new r(6,116)),new y(28,new r(14,46),new r(23,47)),new y(30,new r(44,24),new r(7,25)),new y(30,new r(59,16),new r(1,17))),new K(35,[6,30,54,78,102,126,150],new y(30,new r(12,121),new r(7,122)),new y(28,new r(12,47),new r(26,48)),new y(30,new r(39,24),new r(14,25)),new y(30,
new r(22,15),new r(41,16))),new K(36,[6,24,50,76,102,128,154],new y(30,new r(6,121),new r(14,122)),new y(28,new r(6,47),new r(34,48)),new y(30,new r(46,24),new r(10,25)),new y(30,new r(2,15),new r(64,16))),new K(37,[6,28,54,80,106,132,158],new y(30,new r(17,122),new r(4,123)),new y(28,new r(29,46),new r(14,47)),new y(30,new r(49,24),new r(10,25)),new y(30,new r(24,15),new r(46,16))),new K(38,[6,32,58,84,110,136,162],new y(30,new r(4,122),new r(18,123)),new y(28,new r(13,46),new r(32,47)),new y(30,
new r(48,24),new r(14,25)),new y(30,new r(42,15),new r(32,16))),new K(39,[6,26,54,82,110,138,166],new y(30,new r(20,117),new r(4,118)),new y(28,new r(40,47),new r(7,48)),new y(30,new r(43,24),new r(22,25)),new y(30,new r(10,15),new r(67,16))),new K(40,[6,30,58,86,114,142,170],new y(30,new r(19,118),new r(6,119)),new y(28,new r(18,47),new r(31,48)),new y(30,new r(34,24),new r(34,25)),new y(30,new r(20,15),new r(61,16)))];
function Db(d){if(1>d||40<d)throw Error("QR Error: ArgumentException");return Cb[d-1]}function Eb(d){for(var c=4294967295,a=0,b=0;b<Bb.length;b++){var g=Bb[b];if(g==d)return Db(b+7);g=Fb(d,g);g<c&&(a=b+7,c=g)}return 3>=c?Db(a):null};function Gb(d,c,a,b,g,k,h,l,m){this.o=d;this.s=b;this.u=h;this.v=c;this.w=g;this.A=l;this.B=a;this.C=k;this.D=m;this.sb=function(b){for(var a=b.length,c=this.o,g=this.s,d=this.u,k=this.v,h=this.w,l=this.A,m=this.B,p=this.C,R=this.D,E=0;E<a;E+=2){var S=b[E],z=b[E+1],C=d*S+l*z+R;b[E]=(c*S+k*z+m)/C;b[E+1]=(g*S+h*z+p)/C}};this.Ha=function(){return new Gb(this.w*this.D-this.A*this.C,this.A*this.B-this.v*this.D,this.v*this.C-this.w*this.B,this.u*this.C-this.s*this.D,this.o*this.D-this.u*this.B,this.s*this.B-
this.o*this.C,this.s*this.A-this.u*this.w,this.u*this.v-this.o*this.A,this.o*this.w-this.s*this.v)};this.pb=function(b){return new Gb(this.o*b.o+this.v*b.s+this.B*b.u,this.o*b.v+this.v*b.w+this.B*b.A,this.o*b.B+this.v*b.C+this.B*b.D,this.s*b.o+this.w*b.s+this.C*b.u,this.s*b.v+this.w*b.w+this.C*b.A,this.s*b.B+this.w*b.C+this.C*b.D,this.u*b.o+this.A*b.s+this.D*b.u,this.u*b.v+this.A*b.w+this.D*b.A,this.u*b.B+this.A*b.C+this.D*b.D)}}
function Hb(d,c,a,b,g,k,h,l){var m=l-k,p=c-b+k-l;if(0==m&&0==p)return new Gb(a-d,g-a,d,b-c,k-b,c,0,0,1);var w=a-g,q=h-g;g=d-a+g-h;k=b-k;var u=w*m-q*k;m=(g*m-q*p)/u;p=(w*p-g*k)/u;return new Gb(a-d+m*a,h-d+p*h,d,b-c+m*b,l-c+p*l,c,m,p,1)}function Ib(d){this.i=d}
function Ua(d){this.H=d;this.U=null;this.Ca=function(c,a,b,g){var d=Math.abs(g-a)>Math.abs(b-c);if(d){var h=c;c=a;a=h;h=b;b=g;g=h}var l=Math.abs(b-c),m=Math.abs(g-a),p=-l>>1,w=a<g?1:-1,q=c<b?1:-1,u=0,t=c;for(h=a;t!=b;t+=q){var x=d?h:t,v=d?t:h;1==u?this.H[x+v*f]&&u++:this.H[x+v*f]||u++;if(3==u)return g=t-c,a=h-a,Math.sqrt(g*g+a*a);p+=m;if(0<p){if(h==g)break;h+=w;p-=l}}c=b-c;a=g-a;return Math.sqrt(c*c+a*a)};this.Da=function(c,a,b,g){var d=this.Ca(c,a,b,g),h=1;b=c-(b-c);0>b?(h=c/(c-b),b=0):b>=f&&(h=
(f-1-c)/(b-c),b=f-1);g=Math.floor(a-(g-a)*h);h=1;0>g?(h=a/(a-g),g=0):g>=n&&(h=(n-1-a)/(g-a),g=n-1);b=Math.floor(c+(b-c)*h);d+=this.Ca(c,a,b,g);return d-1};this.qa=function(c,a){var b=this.Da(Math.floor(c.g()),Math.floor(c.h()),Math.floor(a.g()),Math.floor(a.h()));c=this.Da(Math.floor(a.g()),Math.floor(a.h()),Math.floor(c.g()),Math.floor(c.h()));return isNaN(b)?c/7:isNaN(c)?b/7:(b+c)/14};this.Ja=function(c,a,b){return(this.qa(c,a)+this.qa(c,b))/2};this.sa=function(c,a){var b=c.g()-a.g();c=c.h()-a.h();
return Math.sqrt(b*b+c*c)};this.Ka=function(c,a,b,g){c=(Math.round(this.sa(c,a)/g)+Math.round(this.sa(c,b)/g)>>1)+7;switch(c&3){case 0:c++;break;case 2:c--;break;case 3:throw Error("QR Error: in detector");}return c};this.Qa=function(c,a,b,g){g=Math.floor(g*c);var d=Math.max(0,a-g);a=Math.min(f-1,a+g);if(a-d<3*c)throw Error("QR Error: in detector");var h=Math.max(0,b-g);return(new Jb(this.H,d,h,a-d,Math.min(n-1,b+g)-h,c,this.U)).find()};this.La=function(c,a,b,g,d){d-=3.5;var k;if(null!=g){var l=g.g();
g=g.h();var m=k=d-3}else l=a.g()-c.g()+b.g(),g=a.h()-c.h()+b.h(),m=k=d;return Hb(c.g(),c.h(),a.g(),a.h(),l,g,b.g(),b.h()).pb(Hb(3.5,3.5,d,3.5,m,k,3.5,d).Ha())};this.lb=function(c,a,b){for(var g=new Ab(b),d=Array(b<<1),h=0;h<b;h++){for(var l=d.length,m=h+.5,p=0;p<l;p+=2)d[p]=(p>>1)+.5,d[p+1]=m;a.sb(d);m=d;for(var w=f,q=n,u=!0,t=0;t<m.length&&u;t+=2){var x=Math.floor(m[t]),v=Math.floor(m[t+1]);if(-1>x||x>w||-1>v||v>q)throw Error("QR Error: Error.checkAndNudgePoints");u=!1;-1==x?(m[t]=0,u=!0):x==w&&
(m[t]=w-1,u=!0);-1==v?(m[t+1]=0,u=!0):v==q&&(m[t+1]=q-1,u=!0)}u=!0;for(t=m.length-2;0<=t&&u;t-=2){x=Math.floor(m[t]);v=Math.floor(m[t+1]);if(-1>x||x>w||-1>v||v>q)throw Error("QR Error: Error.checkAndNudgePoints");u=!1;-1==x?(m[t]=0,u=!0):x==w&&(m[t]=w-1,u=!0);-1==v?(m[t+1]=0,u=!0):v==q&&(m[t+1]=q-1,u=!0)}try{for(p=0;p<l;p+=2)c[Math.floor(d[p])+f*Math.floor(d[p+1])]&&g.nb(p>>1,h)}catch(ca){throw Error("QR Error: Error.checkAndNudgePoints");}}return g};this.ib=function(c){var a=c.qb,b=c.rb;c=c.Ga;var g=
this.Ja(a,b,c);if(1>g)throw Error("QR Error: in detector");var d=this.Ka(a,b,c,g);if(1!=d%4)throw Error("QR Error: Error getProvisionalVersionForDimension");try{var h=Db(d-17>>2)}catch(w){throw Error("QR Error: Error getVersionForNumber");}var l=h.fa()-7,m=null;if(0<h.ca.length){l=1-3/l;h=Math.floor(a.g()+l*(b.g()-a.g()+c.g()-a.g()));l=Math.floor(a.h()+l*(b.h()-a.h()+c.h()-a.h()));for(var p=4;16>=p;p<<=1)try{m=this.Qa(g,h,l,p);break}catch(w){}}a=this.lb(this.H,this.La(a,b,c,m,d),d);return new Ib(a)};
this.Oa=function(){var c=(new Lb).Ta(this.H);return this.ib(c)}};var Mb=[[21522,0],[20773,1],[24188,2],[23371,3],[17913,4],[16590,5],[20375,6],[19104,7],[30660,8],[29427,9],[32170,10],[30877,11],[26159,12],[25368,13],[27713,14],[26998,15],[5769,16],[5054,17],[7399,18],[6608,19],[1890,20],[597,21],[3340,22],[2107,23],[13663,24],[12392,25],[16177,26],[14854,27],[9396,28],[8579,29],[11994,30],[11245,31]],L=[0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4];function Ob(d){var c=d>>3&3;if(0>c||c>=Sb.length)throw Error("QR Error: ArgumentException");this.Pa=Sb[c];this.Na=d&7}
function Fb(d,c){d^=c;return L[d&15]+L[O(d,4)&15]+L[O(d,8)&15]+L[O(d,12)&15]+L[O(d,16)&15]+L[O(d,20)&15]+L[O(d,24)&15]+L[O(d,28)&15]}function Tb(d){var c=Ub(d);return null!=c?c:Ub(d^21522)}function Ub(d){for(var c=4294967295,a=0,b=0;b<Mb.length;b++){var g=Mb[b],k=g[0];if(k==d)return new Ob(g[1]);k=Fb(d,k);k<c&&(a=g[1],c=k)}return 3>=c?new Ob(a):null};function Vb(d,c,a){this.gb=d;this.i=c;this.name=a;this.getName=function(){return this.name}}var Sb=[new Vb(1,0,"M"),new Vb(0,1,"L"),new Vb(3,2,"H"),new Vb(2,3,"Q")];function Ab(d){var c;c||(c=d);if(1>d||1>c)throw Error("QR Error: Both dimensions must be greater than 0");this.width=d;this.height=c;var a=d>>5;0!=(d&31)&&a++;this.X=a;this.i=Array(a*c);for(d=0;d<this.i.length;d++)this.i[d]=0;this.ea=function(){if(this.width!=this.height)throw Error("QR Error: Can't call getDimension() on a non-square matrix");return this.width};this.ga=function(b,a){return 0!=(O(this.i[a*this.X+(b>>5)],b&31)&1)};this.nb=function(b,a){this.i[a*this.X+(b>>5)]|=1<<(b&31)};this.M=function(b,
a){this.i[a*this.X+(b>>5)]^=1<<(b&31)};this.clear=function(){for(var b=this.i.length,a=0;a<b;a++)this.i[a]=0};this.P=function(b,a,c,d){if(0>a||0>b)throw Error("QR Error: Left and top must be nonnegative");if(1>d||1>c)throw Error("QR Error: Height and width must be at least 1");c=b+c;d=a+d;if(d>this.height||c>this.width)throw Error("QR Error: The region must fit inside the matrix");for(;a<d;a++)for(var g=a*this.X,k=b;k<c;k++)this.i[g+(k>>5)]|=1<<(k&31)}};function ub(d,c){this.ya=d;this.T=c};function tb(d){var c=d.ea();if(21>c||1!=(c&3))throw Error("QR Error: Error BitMatrixParser");this.V=d;this.O=this.J=null;this.K=function(a,b,c){return this.V.ga(a,b)?c<<1|1:c<<1};this.Aa=function(){if(null!=this.O)return this.O;for(var a=0,b=0;6>b;b++)a=this.K(b,8,a);a=this.K(7,8,a);a=this.K(8,8,a);a=this.K(8,7,a);for(b=5;0<=b;b--)a=this.K(8,b,a);this.O=Tb(a);if(null!=this.O)return this.O;var c=this.V.ea();a=0;var d=c-8;for(b=c-1;b>=d;b--)a=this.K(b,8,a);for(b=c-7;b<c;b++)a=this.K(8,b,a);this.O=Tb(a);
if(null!=this.O)return this.O;throw Error("QR Error: Error readFormatInformation");};this.Ba=function(){if(null!=this.J)return this.J;var a=this.V.ea(),b=a-17>>2;if(6>=b)return Db(b);b=0;for(var c=a-11,d=5;0<=d;d--)for(var h=a-9;h>=c;h--)b=this.K(h,d,b);this.J=Eb(b);if(null!=this.J&&this.J.fa()==a)return this.J;b=0;for(h=5;0<=h;h--)for(d=a-9;d>=c;d--)b=this.K(h,d,b);this.J=Eb(b);if(null!=this.J&&this.J.fa()==a)return this.J;throw Error("QR Error: Error readVersion");};this.jb=function(){var a=this.Aa(),
b=this.Ba();a=a.Na;if(0>a||7<a)throw Error("QR Error: System.ArgumentException");var c=Wb[a];a=this.V.ea();c.R(this.V,a);c=b.Ia();for(var d=!0,h=Array(b.na),l=0,m=0,p=0,w=a-1;0<w;w-=2){6==w&&w--;for(var q=0;q<a;q++)for(var u=d?a-1-q:q,t=0;2>t;t++)c.ga(w-t,u)||(p++,m<<=1,this.V.ga(w-t,u)&&(m|=1),8==p&&(h[l++]=m,m=p=0));d^=1}if(l!=b.na)throw Error("QR Error: Error readCodewords");return h}};var Wb=[new function(){this.R=function(d,c){for(var a=0;a<c;a++)for(var b=0;b<c;b++)this.j(a,b)&&d.M(b,a)};this.j=function(d,c){return 0==(d+c&1)}},new function(){this.R=function(d,c){for(var a=0;a<c;a++)for(var b=0;b<c;b++)this.j(a,b)&&d.M(b,a)};this.j=function(d){return 0==(d&1)}},new function(){this.R=function(d,c){for(var a=0;a<c;a++)for(var b=0;b<c;b++)this.j(a,b)&&d.M(b,a)};this.j=function(d,c){return 0==c%3}},new function(){this.R=function(d,c){for(var a=0;a<c;a++)for(var b=0;b<c;b++)this.j(a,
b)&&d.M(b,a)};this.j=function(d,c){return 0==(d+c)%3}},new function(){this.R=function(d,c){for(var a=0;a<c;a++)for(var b=0;b<c;b++)this.j(a,b)&&d.M(b,a)};this.j=function(d,c){return 0==(O(d,1)+c/3&1)}},new function(){this.R=function(d,c){for(var a=0;a<c;a++)for(var b=0;b<c;b++)this.j(a,b)&&d.M(b,a)};this.j=function(d,c){d*=c;return 0==(d&1)+d%3}},new function(){this.R=function(d,c){for(var a=0;a<c;a++)for(var b=0;b<c;b++)this.j(a,b)&&d.M(b,a)};this.j=function(d,c){d*=c;return 0==((d&1)+d%3&1)}},new function(){this.R=
function(d,c){for(var a=0;a<c;a++)for(var b=0;b<c;b++)this.j(a,b)&&d.M(b,a)};this.j=function(d,c){return 0==((d+c&1)+d*c%3&1)}}];function P(d,c){if(null==c||0==c.length)throw Error("QR Error: System.ArgumentException");this.a=d;var a=c.length;if(1<a&&0==c[0]){for(var b=1;b<a&&0==c[b];)b++;if(b==a)this.f=d.l().f;else{this.f=Array(a-b);for(a=0;a<this.f.length;a++)this.f[a]=0;for(a=0;a<this.f.length;a++)this.f[a]=c[b+a]}}else this.f=c;this.l=function(){return 0==this.f[0]};this.I=function(){return this.f.length-1};this.Z=function(b){return this.f[this.f.length-1-b]};this.la=function(b){if(0==b)return this.Z(0);var a=this.f.length;
if(1==b){for(var c=b=0;c<a;c++)b^=this.f[c];return b}var d=this.f[0];for(c=1;c<a;c++)d=Xb(this.a.multiply(b,d),this.f[c]);return d};this.ba=function(b){if(this.a!=b.a)throw Error("QR Error: GF256Polys do not have same GF256 field");if(this.l())return b;if(b.l())return this;var a=this.f;b=b.f;if(a.length>b.length){var c=a;a=b;b=c}c=Array(b.length);for(var g=b.length-a.length,m=0;m<g;m++)c[m]=b[m];for(m=g;m<b.length;m++)c[m]=a[m-g]^b[m];return new P(d,c)};this.wa=function(b){if(this.a!=b.a)throw Error("QR Error: GF256Polys do not have same GF256 field");
if(this.l()||b.l())return this.a.l();var a=this.f,c=a.length;b=b.f;for(var d=b.length,g=Array(c+d-1),p=0;p<c;p++)for(var w=a[p],q=0;q<d;q++)g[p+q]=Xb(g[p+q],this.a.multiply(w,b[q]));return new P(this.a,g)};this.xa=function(b){if(0==b)return this.a.l();if(1==b)return this;for(var a=this.f.length,c=Array(a),d=0;d<a;d++)c[d]=this.a.multiply(this.f[d],b);return new P(this.a,c)};this.eb=function(b,a){if(0>b)throw Error("QR Error: System.ArgumentException");if(0==a)return this.a.l();var c=this.f.length;
b=Array(c+b);for(var d=0;d<b.length;d++)b[d]=0;for(d=0;d<c;d++)b[d]=this.a.multiply(this.f[d],a);return new P(this.a,b)}};function Yb(d){this.Y=Array(256);this.aa=Array(256);for(var c=1,a=0;256>a;a++)this.Y[a]=c,c<<=1,256<=c&&(c^=d);for(a=0;255>a;a++)this.aa[this.Y[a]]=a;d=Array(1);d[0]=0;this.Ea=new P(this,Array(d));d=Array(1);d[0]=1;this.za=new P(this,Array(d));this.l=function(){return this.Ea};this.pa=function(b,a){if(0>b)throw Error("QR Error: System.ArgumentException");if(0==a)return this.Ea;b=Array(b+1);for(var c=0;c<b.length;c++)b[c]=0;b[0]=a;return new P(this,b)};this.exp=function(b){return this.Y[b]};this.log=
function(b){if(0==b)throw Error("QR Error: System.ArgumentException");return this.aa[b]};this.inverse=function(b){if(0==b)throw Error("QR Error: System.ArithmeticException");return this.Y[255-this.aa[b]]};this.multiply=function(b,a){return 0==b||0==a?0:1==b?a:1==a?b:this.Y[(this.aa[b]+this.aa[a])%255]}}var Zb=new Yb(285);new Yb(301);function Xb(d,c){return d^c};var vb=new function(d){this.a=d;this.decode=function(c,a){for(var b=new P(this.a,c),d=Array(a),k=0;k<d.length;k++)d[k]=0;var h=!0;for(k=0;k<a;k++){var l=b.la(this.a.exp(k));d[d.length-1-k]=l;0!=l&&(h=!1)}if(!h)for(k=new P(this.a,d),a=this.kb(this.a.pa(a,1),k,a),k=a[1],a=this.Ra(a[0]),b=this.Sa(k,a),k=0;k<a.length;k++){d=c.length-1-this.a.log(a[k]);if(0>d)throw Error("QR Error: ReedSolomonException Bad error location");c[d]^=b[k]}};this.kb=function(c,a,b){if(c.I()<a.I()){var d=c;c=a;a=d}d=this.a.za;
for(var k=this.a.l(),h=this.a.l(),l=this.a.za;a.I()>=Math.floor(b/2);){var m=c,p=d,w=h;c=a;d=k;h=l;if(c.l())throw Error("QR Error: r_{i-1} was zero");a=m;l=this.a.l();for(k=this.a.inverse(c.Z(c.I()));a.I()>=c.I()&&!a.l();){m=a.I()-c.I();var q=this.a.multiply(a.Z(a.I()),k);l=l.ba(this.a.pa(m,q));a=a.ba(c.eb(m,q))}k=l.wa(d).ba(p);l=l.wa(h).ba(w)}b=l.Z(0);if(0==b)throw Error("QR Error: ReedSolomonException sigmaTilde(0) was zero");b=this.a.inverse(b);c=l.xa(b);b=a.xa(b);return[c,b]};this.Ra=function(c){var a=
c.I();if(1==a)return Array(c.Z(1));for(var b=Array(a),d=0,k=1;256>k&&d<a;k++)0==c.la(k)&&(b[d]=this.a.inverse(k),d++);if(d!=a)throw Error("QR Error: Error locator degree does not match number of roots");return b};this.Sa=function(c,a){for(var b=a.length,d=Array(b),k=0;k<b;k++){for(var h=this.a.inverse(a[k]),l=1,m=0;m<b;m++)k!=m&&(l=this.a.multiply(l,Xb(1,this.a.multiply(a[m],h))));d[k]=this.a.multiply(c.la(h),this.a.inverse(l))}return d}}(Zb);var xb,Qa=null,f=0,n=0,Pa=!1,$b=[[10,9,8,8],[12,11,16,10],[14,13,16,12]],Sa={red:77,blue:150,green:29};function O(d,c){return 0<=d?d>>c:(d>>c)+(2<<~c)};var ac=3,bc=57,cc=2;function dc(d){function c(b,a){var c=b.g()-a.g();b=b.h()-a.h();return Math.sqrt(c*c+b*b)}var a=c(d[0],d[1]),b=c(d[1],d[2]),g=c(d[0],d[2]);b>=a&&b>=g?(b=d[0],a=d[1],g=d[2]):g>=b&&g>=a?(b=d[1],a=d[0],g=d[2]):(b=d[2],a=d[0],g=d[1]);if(0>function(b,a,c){var d=a.x;a=a.y;return(c.x-d)*(b.y-a)-(c.y-a)*(b.x-d)}(a,b,g)){var k=a;a=g;g=k}d[0]=a;d[1]=b;d[2]=g}
function ec(d,c,a){this.x=d;this.y=c;this.count=1;this.G=a;this.g=function(){return this.x};this.h=function(){return this.y};this.va=function(){this.count++};this.ha=function(b,a,c){return Math.abs(a-this.y)<=b&&Math.abs(c-this.x)<=b?(b=Math.abs(b-this.G),1>=b||1>=b/this.G):!1}}function fc(d){this.Ga=d[0];this.qb=d[1];this.rb=d[2]}
function Lb(){this.H=null;this.c=[];this.ma=!1;this.L=[0,0,0,0,0];this.U=null;this.ta=function(){this.L[0]=0;this.L[1]=0;this.L[2]=0;this.L[3]=0;this.L[4]=0;return this.L};this.N=function(d){for(var c=0,a=0;5>a;a++){var b=d[a];if(0==b)return!1;c+=b}if(7>c)return!1;c=Math.floor(c/7);a=Math.floor(.7*c);return Math.abs(c-d[0])<a&&Math.abs(c-d[1])<a&&Math.abs(3*c-d[2])<3*a&&Math.abs(c-d[3])<a&&Math.abs(c-d[4])<a};this.W=function(d,c){return c-d[4]-d[3]-d[2]/2};this.ia=function(d,c,a,b){for(var g=this.H,
k=n,h=this.ta(),l=d;0<=l&&g[c+l*f];)h[2]++,l--;if(0>l)return NaN;for(;0<=l&&!g[c+l*f]&&h[1]<=a;)h[1]++,l--;if(0>l||h[1]>a)return NaN;for(;0<=l&&g[c+l*f]&&h[0]<=a;)h[0]++,l--;if(h[0]>a)return NaN;for(l=d+1;l<k&&g[c+l*f];)h[2]++,l++;if(l==k)return NaN;for(;l<k&&!g[c+l*f]&&h[3]<a;)h[3]++,l++;if(l==k||h[3]>=a)return NaN;for(;l<k&&g[c+l*f]&&h[4]<a;)h[4]++,l++;return h[4]>=a||5*Math.abs(h[0]+h[1]+h[2]+h[3]+h[4]-b)>=2*b?NaN:this.N(h)?this.W(h,l):NaN};this.Ma=function(d,c,a,b){for(var g=this.H,k=f,h=this.ta(),
l=d;0<=l&&g[l+c*f];)h[2]++,l--;if(0>l)return NaN;for(;0<=l&&!g[l+c*f]&&h[1]<=a;)h[1]++,l--;if(0>l||h[1]>a)return NaN;for(;0<=l&&g[l+c*f]&&h[0]<=a;)h[0]++,l--;if(h[0]>a)return NaN;for(l=d+1;l<k&&g[l+c*f];)h[2]++,l++;if(l==k)return NaN;for(;l<k&&!g[l+c*f]&&h[3]<a;)h[3]++,l++;if(l==k||h[3]>=a)return NaN;for(;l<k&&g[l+c*f]&&h[4]<a;)h[4]++,l++;return h[4]>=a||5*Math.abs(h[0]+h[1]+h[2]+h[3]+h[4]-b)>=b?NaN:this.N(h)?this.W(h,l):NaN};this.$=function(d,c,a){var b=d[0]+d[1]+d[2]+d[3]+d[4];a=this.W(d,a);c=this.ia(c,
Math.floor(a),d[2],b);if(!isNaN(c)&&(a=this.Ma(Math.floor(a),Math.floor(c),d[2],b),!isNaN(a))){d=b/7;b=!1;for(var g=this.c.length,k=0;k<g;k++){var h=this.c[k];if(h.ha(d,c,a)){h.va();b=!0;break}}b||(a=new ec(a,c,d),this.c.push(a),null!=this.U&&this.U.Va(a));return!0}return!1};this.mb=function(){var d=this.c.length;if(3>d)throw Error("QR Error: Couldn't find enough finder patterns (found "+d+")");if(3<d){for(var c=0,a=0,b=0;b<d;b++){var g=this.c[b].G;c+=g;a+=g*g}var k=c/d;this.c.sort(function(b,a){a=
Math.abs(a.G-k);b=Math.abs(b.G-k);return a<b?-1:a==b?0:1});d=Math.max(.2*k,Math.sqrt(a/d-k*k));for(b=this.c.length-1;0<=b;b--)Math.abs(this.c[b].G-k)>d&&this.c.splice(b,1)}3<this.c.length&&this.c.sort(function(b,a){return b.count>a.count?-1:b.count<a.count?1:0});return[this.c[0],this.c[1],this.c[2]]};this.Ua=function(){var d=this.c.length;if(1>=d)return 0;for(var c=null,a=0;a<d;a++){var b=this.c[a];if(b.count>=cc)if(null==c)c=b;else return this.ma=!0,Math.floor((Math.abs(c.g()-b.g())-Math.abs(c.h()-
b.h()))/2)}return 0};this.ua=function(){for(var d=0,c=0,a=this.c.length,b=0;b<a;b++){var g=this.c[b];g.count>=cc&&(d++,c+=g.G)}if(3>d)return!1;d=c/a;var k=0;for(b=0;b<a;b++)g=this.c[b],k+=Math.abs(g.G-d);return k<=.05*c};this.Ta=function(d){this.H=d;var c=n,a=f,b=Math.floor(3*c/(4*bc));b<ac&&(b=ac);for(var g=!1,k=Array(5),h=b-1;h<c&&!g;h+=b){k[0]=0;k[1]=0;k[2]=0;k[3]=0;for(var l=k[4]=0,m=0;m<a;m++)if(d[m+h*f])1==(l&1)&&l++,k[l]++;else if(0==(l&1))if(4==l)if(this.N(k)){if(l=this.$(k,h,m))b=2,this.ma?
g=this.ua():(l=this.Ua(),l>k[2]&&(h+=l-k[2]-b,m=a-1));else{do m++;while(m<a&&!d[m+h*f]);m--}l=0;k[0]=0;k[1]=0;k[2]=0;k[3]=0;k[4]=0}else k[0]=k[2],k[1]=k[3],k[2]=k[4],k[3]=1,k[4]=0,l=3;else k[++l]++;else k[l]++;this.N(k)&&(l=this.$(k,h,a))&&(b=k[0],this.ma&&(g=this.ua()))}d=this.mb();dc(d);return new fc(d)}};function gc(d,c,a){this.x=d;this.y=c;this.count=1;this.G=a;this.g=function(){return Math.floor(this.x)};this.h=function(){return Math.floor(this.y)};this.va=function(){this.count++};this.ha=function(b,a,c){return Math.abs(a-this.y)<=b&&Math.abs(c-this.x)<=b?(b=Math.abs(b-this.G),1>=b||1>=b/this.G):!1}}
function Jb(d,c,a,b,g,k,h){this.H=d;this.c=[];this.ob=c;this.width=b;this.height=g;this.cb=k;this.L=[0,0,0];this.U=h;this.W=function(b,a){return a-b[2]-b[1]/2};this.N=function(b){for(var a=this.cb,c=a/2,d=0;3>d;d++)if(Math.abs(a-b[d])>=c)return!1;return!0};this.ia=function(b,a,c,d){var g=this.H,k=n,h=this.L;h[0]=0;h[1]=0;h[2]=0;for(var l=b;0<=l&&g[a+l*f]&&h[1]<=c;)h[1]++,l--;if(0>l||h[1]>c)return NaN;for(;0<=l&&!g[a+l*f]&&h[0]<=c;)h[0]++,l--;if(h[0]>c)return NaN;for(l=b+1;l<k&&g[a+l*f]&&h[1]<=c;)h[1]++,
l++;if(l==k||h[1]>c)return NaN;for(;l<k&&!g[a+l*f]&&h[2]<=c;)h[2]++,l++;return h[2]>c||5*Math.abs(h[0]+h[1]+h[2]-d)>=2*d?NaN:this.N(h)?this.W(h,l):NaN};this.$=function(b,a,c){c=this.W(b,c);a=this.ia(a,Math.floor(c),2*b[1],b[0]+b[1]+b[2]);if(!isNaN(a)){b=(b[0]+b[1]+b[2])/3;for(var d=this.c.length,g=0;g<d;g++)if(this.c[g].ha(b,a,c))return new gc(c,a,b);c=new gc(c,a,b);this.c.push(c);null!=this.U&&this.U.Va(c)}return null};this.find=function(){for(var c=this.ob,g=this.height,k=c+b,h=a+(g>>1),q=[0,0,
0],u=0;u<g;u++){var t=h+(0==(u&1)?u+1>>1:-(u+1>>1));q[0]=0;q[1]=0;q[2]=0;for(var x=c;x<k&&!d[x+f*t];)x++;for(var v=0;x<k;){if(d[x+t*f])if(1==v)q[v]++;else if(2==v){if(this.N(q)&&(v=this.$(q,t,x),null!=v))return v;q[0]=q[2];q[1]=1;q[2]=0;v=1}else q[++v]++;else 1==v&&v++,q[v]++;x++}if(this.N(q)&&(v=this.$(q,t,k),null!=v))return v}if(0!=this.c.length)return this.c[0];throw Error("QR Error: Couldn't find enough alignment patterns");}};function wb(d,c,a){this.F=0;this.b=7;this.S=d;this.fb=a;9>=c?this.ja=0:10<=c&&26>=c?this.ja=1:27<=c&&40>=c&&(this.ja=2);this.m=function(b){var a;if(b<this.b+1){var c=0;for(a=0;a<b;a++)c+=1<<a;c<<=this.b-b+1;a=(this.S[this.F]&c)>>this.b-b+1;this.b-=b;return a}if(b<this.b+1+8){var d=0;for(a=0;a<this.b+1;a++)d+=1<<a;a=(this.S[this.F]&d)<<b-(this.b+1);this.F++;a+=this.S[this.F]>>8-(b-(this.b+1));this.b-=b%8;0>this.b&&(this.b=8+this.b);return a}if(b<this.b+1+16){for(a=c=d=0;a<this.b+1;a++)d+=1<<a;d=(this.S[this.F]&
d)<<b-(this.b+1);this.F++;var l=this.S[this.F]<<b-(this.b+1+8);this.F++;for(a=0;a<b-(this.b+1+8);a++)c+=1<<a;c<<=8-(b-(this.b+1+8));a=d+l+((this.S[this.F]&c)>>8-(b-(this.b+1+8)));this.b-=(b-8)%8;0>this.b&&(this.b=8+this.b);return a}return 0};this.Fa=function(){return this.F>this.S.length-this.fb-2?0:this.m(4)};this.Ya=function(b){for(var a=0;1!=b>>a;)a++;return this.m($b[this.ja][a])};this.bb=function(b){var a="",c="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:".split("");do if(1<b){var d=this.m(11);
var l=d%45;a+=c[Math.floor(d/45)];a+=c[l];b-=2}else 1==b&&(d=this.m(6),a+=c[d],--b);while(0<b);return a};this.$a=function(b){var a=0,c="";do 3<=b?(a=this.m(10),100>a&&(c+="0"),10>a&&(c+="0"),b-=3):2==b?(a=this.m(7),10>a&&(c+="0"),b-=2):1==b&&(a=this.m(4),--b),c+=a;while(0<b);return c};this.Wa=function(b){var a=[];do{var c=this.m(8);a.push(c);b--}while(0<b);return a};this.ab=function(b){var a="";do{var c=this.m(13);c=(c/192<<8)+c%192;a+=String.fromCharCode(40956>=c+33088?c+33088:c+49472);b--}while(0<
b);return a};this.hb=function(){var b=this.m(8);128==(b&192)&&this.m(8);192==(b&224)&&this.m(8)};this.Xa=function(){var b=[];do{var a=this.Fa();if(0==a)if(0<b.length)break;else throw Error("QR Error: Empty data block");if(1!=a&&2!=a&&4!=a&&8!=a&&7!=a)throw Error("QR Error: Invalid mode: "+a+" in (block:"+this.F+" bit:"+this.b+")");if(7==a)this.hb();else{var c=this.Ya(a);if(1>c)throw Error("QR Error: Invalid data length: "+c);switch(a){case 1:a=this.$a(c);c=Array(a.length);for(var d=0;d<a.length;d++)c[d]=
a.charCodeAt(d);b.push(c);break;case 2:a=this.bb(c);c=Array(a.length);for(d=0;d<a.length;d++)c[d]=a.charCodeAt(d);b.push(c);break;case 4:a=this.Wa(c);b.push(a);break;case 8:a=this.ab(c),b.push(a)}}}while(1);return b}};
}).call(this)
//# sourceMappingURL=qr-scanner-worker.min.js.map
`;
/** @preserve @asset(/libraries/qr-scanner/qr-scanner-worker.min.js) */