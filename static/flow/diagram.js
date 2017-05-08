var g_nextBlockId = 1;  // used to assign unique numeric IDs to each block

var BLOCK_HISTORY_LIMIT = 1000;


// create an object representing a data flow diagram
// create a diagram object from a diagram spec dictionary (deserialize a diagram)
var Diagram = function(diagramSpec){
	this.blocks = [];
	g_nextBlockId = 1;

	// first pass: create blocks
	for (var i = 0; i < diagramSpec.blocks.length; i++) {
		var blockSpec = diagramSpec.blocks[i];
		var block = new FlowBlock(blockSpec);
		this.blocks.push(block);
		if (block.id >= g_nextBlockId) {
			g_nextBlockId = block.id + 1;
		}
	}

	// second pass: create links between blocks (between pins)
	for (var i = 0; i < diagramSpec.blocks.length; i++) {
		var blockSpec = diagramSpec.blocks[i];
		if (blockSpec.sources) {
			var block = this.blocks[i];
			for (var j = 0; j < blockSpec.sources.length; j++) {

				// find the source pin (output pin of source block)
				var sourceId = blockSpec.sources[j];
				var sourceBlock = this.findBlockById(sourceId);
				var sourcePin = null;
				for (var k = 0; k < sourceBlock.pins.length; k++) {
					var pin = sourceBlock.pins[k];
					if (pin.isInput === false) {
						sourcePin = pin;
					}
				}

				// find an empty input pin and link it to the source
				if (sourcePin) {
					for (var k = 0; k < block.pins.length; k++) {
						var pin = block.pins[k];
						if (pin.isInput && pin.sourcePin === null) {
							pin.sourcePin = sourcePin;
							break;
						}
					}
				}
			}
		}
	}

	return this;
}

// remove a block from the diagram (this doesn't update user interface, just the diagram data structure)
Diagram.prototype.removeBlock = function(block) {

	// remove connections involving block
	var destPins = this.findDestPins(block);
	for (var i = 0; i < destPins.length; i++) {
		destPins[i].sourcePin = null;
	}

	// remove blocks
	var blocks = [];
	for (var i = 0; i < this.blocks.length; i++) {
		var b = this.blocks[i];
		if (b.id !== block.id) {
			blocks.push(b);
		}
	}
	this.blocks = blocks;
};

// return block by ID
Diagram.prototype.findBlockById = function(id) {
	var block = null;
	for (var i = 0; i < this.blocks.length; i++) {
		if (this.blocks[i].id === id) {
			block = this.blocks[i];
			break;
		}
	}
	return block;
};

// find a block by name; returns null if not found
// (note: names are not necessarily unique; will return first found)
Diagram.prototype.findBlockByName = function(name) {
	var block = null;
	for (var i = 0; i < this.blocks.length; i++) {
		if (this.blocks[i].name === name) {
			block = this.blocks[i];
			break;
		}
	}
	return block;
};

// find a list of connection destination pins (pins for which the given block is source)
Diagram.prototype.findDestPins = function(block) {
	var pins = [];
	for (var i = 0; i < this.blocks.length; i++) {
		var b = this.blocks[i];
		for (var j = 0; j < b.pins.length; j++) {
			var p = b.pins[j];
			if (p.sourcePin && p.sourcePin.block.id === block.id) {
				pins.push(p);
			}
		}
	}
	return pins;
};

var FlowBlock = function(blockSpec){
	this.name = blockSpec.name;  // name should be unique
	this.type = blockSpec.type;
	this.units = blockSpec.units;
	this.pins = [];
	this.inputCount = blockSpec.input_count || 0;  // fix(soon): remove this and use inputPins and outputPins?
	this.outputCount = blockSpec.output_count || 0;
	this.value = blockSpec.value || null;  // null means no defined value
	this.stale = true;  // value needs to be updated
	this.inputType = blockSpec.input_type || 'n';  // default to numeric
	this.outputType = blockSpec.output_type || 'n';  // default to numeric
	this.hasSeq = blockSpec.has_seq || false;  // false if corresponds to physical hardware
	if (blockSpec.id) {
		this.id = blockSpec.id;
	} else {
		this.id = g_nextBlockId;
		g_nextBlockId++;
	}

	this.history = {
		values: [],
		timestamps: []
	};
	if (this.value){
		this.history.values.push(this.value);
		this.history.timestamps.push(moment().valueOf() * 0.001);
	}

	// view-related data is stored in this sub-object
	this.view = {
		x: 0,
		y: 0
	};
	if (blockSpec.view) {
		this.view.x = blockSpec.view.x || 0;
		this.view.y = blockSpec.view.y || 0;
	}

	// add pins
	for (var i = 0; i < this.inputCount; i++) {
		this.pins.push(new Pin(this, i, true));
	}
	for (var i = 0; i < this.outputCount; i++) {
		this.pins.push(new Pin(this, i, false));
	}

	return this;
}

// serialize to dictionary (suitable for conversion to JSON)
FlowBlock.prototype.asSpec = function(){
	var sources = [];
	for (var i = 0; i < this.pins.length; i++) {
		var pin = this.pins[i];
		if (pin.sourcePin) {
			sources.push(pin.sourcePin.block.id);
		}
	}
	return {
		id: this.id,
		name: this.name,
		type: this.type,
		units: this.units,
		sources: sources,  // list of source block IDs
		input_count: this.inputCount,
		output_count: this.outputCount,
		input_type: this.inputType,
		output_type: this.outputType,
		has_seq: this.hasSeq,
		value: this.type === 'camera' ? '' : this.value,  // fix(soon): only really needed for user input blocks; make sure not saving misc images in spec
		view: {
			x: this.view.x,
			y: this.view.y,
		},
	}
}


FlowBlock.prototype.updateValue = function(value, timestamp){
	this.value = value;

	timestamp = timestamp || Math.round(moment().valueOf() * 0.001);
	this.history.values.push(value);
	this.history.timestamps.push(timestamp);

	console.log('Updated:', value, 'at', timestamp)

	if (this.history.length === BLOCK_HISTORY_LIMIT){
		this.history.values.shift();
		this.history.timestamps.shift();
	}
};

// create a new data flow block object
// this function is called createFlowBlock rather than createBlock to avoid conflicts with blocks.js library provided by server platform
function createFlowBlock(blockSpec) { // TODO: eventually remove this legacy API
	return new FlowBlock(blockSpec);
}


// create a pin object that represents a potential input or output connection for a block
var Pin = function(block, index, isInput) {
	// this.block = block; // This introduces a circular reference and is most likely unnecessary since pins are associated with blocks
	this.index = index;  // fix(soon): rethink this
	this.isInput = isInput;
	this.sourcePin = null;  // the source pin object (if connected)
	this.view = {};
	this.view.x = 0;
	this.view.y = 0;
	return this;
}



// create a diagram spec dictionary from a diagram object (serialize a diagram)
function diagramToSpec(diagram) {
	var blocks = [];
	for (var i = 0; i < diagram.blocks.length; i++) {
		blocks.push(diagram.blocks[i].asSpec());
	}
	return {'file_version': '0.1', 'blocks': blocks};
}
