function addFilterMethods(block, type) {

    console.log("[DEBUG] addFilterMethods()", type);

    // make sure this is an allowed type
    var _allowedFilterTypes = allowedFilterTypes();
    if(_allowedFilterTypes.indexOf(type) == -1) {
        console.log("Invalid filter block type: " + type);
        return;
    }

    block.inputCount = type === "not" || type === "exponential moving average" || type === "simple moving average" || type === "absolute value" ? 1 : 2;
    block.outputCount = 1;

    // filter-specific block attributes
    block.lastAverage = null;
    block.averageStorage = [];

    // This will execute the switch once when the block is created. After that,
    // computeFilterValue will just be one of these functions.
    block.computeFilterValue = (function() {

        console.log("[DEBUG] computeFilterValue()");

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
            case 'simple moving average':
                return function(inputs) {
                    return block.computeMovingAverage(inputs[0], block.params[0].value);//return block.computeMovingAverage(inputs[0], block.boxSize);
                };
            case 'exponential moving average':
                return function(inputs) {
                    return block.computeEMA(inputs[0], block.params[0].value);//return block.computeEMA(inputs[0], block.boxSize);
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
        if(len > 0){
            for (var i = 0; i < len; i++) {
                avg += block.averageStorage[i] / len;
            }
        }
        //incorrect calculation, leave in in case we need to compare methods
        /*
        if (len < boxSize && len > 0) {
            for (var i = 0; i < len; i++) {
                avg += block.averageStorage[i] / len;
            }
        } else if (block.lastAverage !== null) {
            avg = block.lastAverage + 1 / boxSize * (newValue - block.averageStorage[0]);
        }
        */
        block.lastAverage = avg;
        return avg;
    };

    block.computeEMA = function(newValue, boxSize) {
        var avg = 0;
        if (block.lastAverage !== null) {
            //incorrect calculation, leave in in case we need to compare methods
            //var alpha = boxSize / (boxSize + 1);
            //avg = block.lastAverage * alpha + newValue * (1 - alpha);

            if(isNaN(newValue) || newValue==null || newValue==undefined) {
                //something went wrong and we were passed a bad value
                //reuse the previous value
                avg = block.lastAverage;
            }
            else{
                //correct computation of EMA
                //k = 2/(n+1) or alpha = 2/(boxsize + 1)
                //ema = current*k + emaPrev * (1-k) or avg = newValue*k + block.lastAverage * (1-alpha)
                var alpha = 2 / (boxSize + 1);
                avg = newValue * alpha + block.lastAverage * (1 - alpha);
            }
        }
        else{
            //we have no previous EMA, start with an average of existing values
            //in this case this is just the currentVal (since we only have 1 value)
            if(newValue!=undefined && newValue!=null && !isNaN(newValue))
                avg = newValue;
        }
        block.lastAverage = avg;
        return avg;
    };
}

function allowedFilterTypes() {
    return [
        "not", "and", "or", "xor", "nand",
        "simple moving average", "exponential moving average",
        "plus", "minus", "times", "divided by", "absolute value",
        "equals", "not equals", "less than", "greater than",
    ];
}

