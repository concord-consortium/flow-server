const DEVICE_BLOCKS = ["temperature", "humidity", "light", "soilmoisture", "CO2", "O2"];

const FILTER_BLOCKS = ["and", "or", "not", "xor", "nand", "plus", "minus", "times", "divided by", "absolute value", "equals", "not equals", "less than", "greater than"];

const UNITS_MAP = {
  humidity:       'percent',
  temperature:    'degrees C',
  CO2:            'PPM',
  light:          'lux',
  soilmoisture:   '',
  timer:          'seconds',
  O2:             'percent'
};