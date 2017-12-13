function addFilterMethods(block, type) {

    // console.log("[DEBUG] addFilterMethods()", type);

    // make sure this is an allowed type
    var _allowedFilterTypes = allowedFilterTypes();
    if(_allowedFilterTypes.indexOf(type) == -1) {
        console.log("Invalid filter block type: " + type);
        return;
    }
    
    block.inputCount = type === "not" || type === "box" || type === "ema" || type === "absolute value" ? 1 : 2;
    block.outputCount = 1;
    
    // filter-specific block attributes
    block.lastAverage = null;
    block.averageStorage = [];
    
    // This will execute the switch once when the block is created. After that,
    // computeFilterValue will just be one of these functions.
    block.computeFilterValue = (function() {

        // console.log("[DEBUG] computeFilterValue()");

        switch (block.type) {
            case 'and':
                return function(inputs) {
                    return (inputs[0] & inputs[1]);
                };
            case 'or':
                return function(inputs) {
                    return (inputs[0] | inputs[1]);
                };
            case 'xor':
                return function(inputs) {
                    return (inputs[0] ^ inputs[1]);
                };
            case 'not':
                return function(inputs) {
                    return 1 - inputs[0];
                };
            case 'nand':
                return function(inputs) {
                    return 1 - (inputs[0] & inputs[1]);
                };
            case 'plus':
                return function(inputs) {
                    return inputs[0] + inputs[1];
                };
            case 'minus':
                return function(inputs) {
                    return inputs[0] - inputs[1];
                };
            case 'times':
                return function(inputs) {
                    return inputs[0] * inputs[1];
                };
            case 'divided by':
                return function(inputs) {
                    return (Math.abs( inputs[1] ) > 1e-8) ? inputs[0] / inputs[1] : 0;
                };
            case 'absolute value':
                return function(inputs) {
                    return Math.abs( inputs[0] );
                };
            case 'equals':
                return function(inputs) {
                    return inputs[0] == inputs[1] ? 1 : 0;
                };
            case 'not equals':
                return function(inputs) {
                    return inputs[0] !== inputs[1] ? 1 : 0;
                };
            case 'less than':
                return function(inputs) {
                    return inputs[0] < inputs[1] ? 1 : 0;
                };
            case 'greater than':
                return function(inputs) {
                    return inputs[0] > inputs[1] ? 1 : 0;
                };
            case 'box':
                return function(inputs) {
                    return block.computeMovingAverage(inputs[0], block.boxSize);
                };
            case 'ema':
                return function(inputs) {
                    return block.computeEMA(inputs[0], block.boxSize);
                };
        }
    })();

    // Box size isn't intended to be dynamic.
    // To do that we'd have to shift averageStorage in a while loop.
    block.computeMovingAverage = function(newValue, boxSize) {
        var avg = 0;

        block.averageStorage.push(newValue);
        if(block.averageStorage.length > boxSize) {
            block.averageStorage.shift();
        }

        var len = block.averageStorage.length;
        if (len < boxSize && len > 0) {
            for (var i = 0; i < len; i++) {
                avg += block.averageStorage[i] / len;
            }
        } else if (block.lastAverage !== null) {
            avg = block.lastAverage + 1 / boxSize * (newValue - block.averageStorage[0]);
        }
        block.lastAverage = avg;
        return avg;
    };

    block.computeEMA = function(newValue, boxSize) {
        var avg = 0;
        if (block.lastAverage !== null) {
            var alpha = boxSize / (boxSize + 1);
            avg = block.lastAverage * alpha + newValue * (1 - alpha);
        }
        block.lastAverage = avg;
        return avg;
    };
}

function allowedFilterTypes() {
    return [
        "not", "and", "or", "xor", "nand",
        "box", "ema",
        "plus", "minus", "times", "divided by", "absolute value",
        "equals", "not equals", "less than", "greater than"
    ];
}

