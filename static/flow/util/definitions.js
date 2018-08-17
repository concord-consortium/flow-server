const DEVICE_BLOCKS = ["temperature", "humidity", "light", "soilmoisture", "CO2", "O2"];

const FILTER_BLOCKS = ["and", "or", "not", "xor", "nand", "plus", "minus", "times", "divided by", "absolute value", "equals", "not equals", "less than", "greater than"];

const UNITS_MAP = {
    humidity: 'percent',
    temperature: 'degrees C',
    CO2: 'PPM',
    light: 'lux',
    soilmoisture: '',
    timer: 'seconds',
    O2: 'percent'
};

const ICON_TYPE_MAP = {
    "temperature": "temperature.png",
    "humidity": "humidity.png",
    "CO2": "co2.png",
    "O2": "o2.png",
    "light": "light.png",
    "soilmoisture": "soilmoisture.png",
    "number": "logic-numeric.png",
    "plus": "logic-plus.png",
    "minus": "logic-minus.png",
    "times": "logic-times.png",
    "divided by": "logic-divide.png",
    "greater than": "logic-greaterthan.png",
    "less than": "logic-lessthan.png",
    "equals": "logic-equals.png",
    "not equals": "logic-notequals.png",
    "and": "logic-and.png",
    "or": "logic-or.png",
    "not": "logic-not.png",
    "nand": "logic-nand.png",
    "xor": "logic-xor.png",
    "absolute value": "logic-abs.png",
    "moving average": "logic-movingavg.png",
    "exp moving average": "logic-expmovingavg.png",
    "timer": "timer.png",
    "relay": "output-relay.png",
    "plot": "output-plot.png",
    "data storage": "output-data.png"
}