/**
 * @var filterSelector - file path save
 * @var canvas - ori image canvas
 * @var loadCtx - ori image canvas #2d filter and commande
 * @var filterCtx - filter image canvas #2d filter and commande
 */
const brightnessLevel = 256;
var fileSelector;
var canvas;
var filterCanvas;
var loadCtx;
var filterCtx;
var pixels;

/**
 * init - this function is init function
 */
$(function () {

    fileSelector = document.querySelector('input#loadButton');
    fileSelector.addEventListener('change', fileChangeHandler);  //리스너 추가. change 형식의 fileChangeHandler 등

    canvas = document.querySelector('canvas#loadCanvas');
    loadCtx = canvas.getContext('2d');

    filterCanvas = document.querySelector('canvas#filterCanvas');
    filterCtx = filterCanvas.getContext('2d');

    $('#filterButton').on('click', function () {
        let pixels = loadCtx.getImageData(0, 0, canvas.width, canvas.height);
        let filteredData = getFilter(pixels);

        // Canvas에 다시 그린다.
        drawImageData(filteredData, filterCtx, filterCanvas);

    });
});

/**
 * this function call by {@link getfilter}.
 */
function getLight(r, g, b) {
    return Math.round(r * 0.299 + g * 0.587 + b * 0.114);
}



/**
 * this function call by file#load handle by {@link #loadButton#html}.
 */
function fileChangeHandler(event) {

    let file = event.target.files[0];
    if (!file.type.startsWith('image/')) {
        alert("not image");
        return;
    }

    let filereader = new FileReader();

    filereader.onload = function (e) {
        let image = new Image();
        image.src = e.target.result;

        image.onload = function () {
            drawImageData(image, loadCtx, canvas);
        }
    }

    filereader.readAsDataURL(file);
}


/**
 * 블록 오츠를 하기 위한거----- 아직 미구현---
 * get image div - image/16
 * this funtion use block(/16)
 */
function getImageDataForBlockOtus(image) {

    let b_height = Math.round(image.naturalHeight / 4);
    let b_width = Math.round(image.naturalWidth / 4);

    let canvas = document.createElement('canvas');
    let C_context = canvas.getContext('2d');

    let result = new Array();

    canvas.width = b_width;
    canvas.height = b_height;

    for (let i = 0; i < 4; i++) {

        for (let j = 0; j < 4; j++) {

            C_context.clearRect(0, 0, canvas.width, canvas.height);
            C_context.drawImage(image, b_width * j, b_height * i);
            result[j] = C_context.getImageData(0, 0, canvas.width, canvas.height);
        }
    }

    canvas.remove();
    return result;

}

/**
 * this function run to event Draw into canvas(filter)
 * @param {image} image this image is ori load  
 * @param {context} Ctx this context connect ori canvas and get command #2d
 * @param {canvas} inCanvas this canvas is load ori image and save
 */
function drawImageData(image, Ctx, inCanvas) {


    Ctx.clearRect(0, 0, inCanvas.width, inCanvas.height);

    image.height *= inCanvas.offsetWidth / image.width;
    image.width = inCanvas.offsetWidth;

    if (image.height > inCanvas.offsetHeight) {
        image.width *= inCanvas.offsetHeight / image.height;
        image.height = inCanvas.offsetHeight;
    }

    inCanvas.width = image.width;
    inCanvas.height = image.height;

    if (image instanceof HTMLImageElement) { //자체 이미지일때
        Ctx.drawImage(image, 0, 0, image.width, image.height);
    } else if (image instanceof ImageData) { //픽셀 데이터일때
        Ctx.putImageData(image, 0, 0);
    }

    return 

}


/**
 * this function defind filter and div image  
 * @param {imageData} pixels - ori image Data
 */
function getFilter(pixels) {
    let imgData = pixels;
    let count = pixels.data.length;
    let imgdataEqualised = new Array();
    let histogram = new Array();

    let classVarianceMin = 9999;
    let threshold = 0;

    let bk_weight = 0;
    let bk_mean = 0;
    let bk_variance = 0;

    let fo_weight = 0;
    let fo_mean = 0;
    let fo_variance = 0;

    for (let j = 0; j < brightnessLevel; j += 1) {
        imgdataEqualised[j] = 0;
        histogram[j] = 0;
    }

    for (let i = 0; i < count; i += 1) {
        let offset = 4 * i;
        let r = imgData.data[offset + 0];
        let g = imgData.data[offset + 1];
        let b = imgData.data[offset + 2];
        histogram[getLight(r, g, b)] += 1;
    }

    imgdataEqualised[0] = histogram[0];
    for (let j = 1; j < brightnessLevel; j += 1) {
        imgdataEqualised[j] = histogram[j] + imgdataEqualised[j - 1];
    }


    for (let k = 0; k < brightnessLevel; k += 1) {


        let div_imgEqual = imgdataEqualised[255] - imgdataEqualised[k];

        bk_weight = imgdataEqualised[k] / count;
        for (let l = 0; l <= k; l += 1) {
            if (imgdataEqualised[k] === 0) continue;
            let accl_mean = (l * histogram[l]) / imgdataEqualised[k];
            bk_mean += accl_mean;
        }

        for (let o = 0; o <= k; o += 1) {
            if (imgdataEqualised[k] === 0) continue;
            let accl_variance = (Math.pow((o - bk_mean), 2) * histogram[o]) / imgdataEqualised[k];
            bk_variance += accl_variance;
        }

        fo_weight = div_imgEqual / count;
        for (let l = k + 1; l < brightnessLevel; l += 1) {
            if (div_imgEqual === 0) continue;
            let accl_mean = (l * histogram[l]) / div_imgEqual;
            fo_mean += accl_mean;
        }

        for (let o = k + 1; o < brightnessLevel; o += 1) {
            if (div_imgEqual === 0) continue;
            let accl_variance = (Math.pow((o - fo_mean), 2) * histogram[o]) / div_imgEqual;
            fo_variance += accl_variance;
        }


        let classVariance = (bk_weight * bk_variance) + (fo_weight * fo_variance);

        bk_mean = 0;
        bk_variance = 0;

        fo_mean = 0;
        fo_variance = 0;

        if (classVariance < classVarianceMin) {
            classVarianceMin = classVariance;
            threshold = k;
        }
    }

    for (let i = 0; i < count; i += 1) {
        let offset = 4 * i;

        let light = getLight(imgData.data[offset + 0], imgData.data[offset + 1], imgData.data[offset + 2])
        if (light < threshold) {
            imgData.data[offset + 0] = 0;
            imgData.data[offset + 1] = 0;
            imgData.data[offset + 2] = 0;
        }
        else {
            imgData.data[offset + 0] = 255;
            imgData.data[offset + 1] = 255;
            imgData.data[offset + 2] = 255;
        }
        imgData[offset + 3] = 255;
    }

    return imgData;
}


