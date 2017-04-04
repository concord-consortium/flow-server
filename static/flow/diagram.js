var g_nextBlockId = 1;  // used to assign unique numeric IDs to each block

var BLOCK_HISTORY_LIMIT = 1000;


// create an object representing a data flow diagram
function createDiagram() {
	var diagram = {};
	diagram.blocks = [];
	g_nextBlockId = 1;

	// remove a block from the diagram (this doesn't update user interface, just the diagram data structure)
	diagram.removeBlock = function(block) {

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
	diagram.findBlockById = function(id) {
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
	diagram.findBlockByName = function(name) {
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
	diagram.findDestPins = function(block) {
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

	return diagram;
}


// create a new data flow block object
// this function is called createFlowBlock rather than createBlock to avoid conflicts with blocks.js library provided by server platform
function createFlowBlock(blockSpec) {
	var block = {};
	block.name = blockSpec.name;  // name should be unique
	block.type = blockSpec.type;
	block.units = blockSpec.units;
	block.pins = [];
	block.inputCount = blockSpec.input_count || 0;  // fix(soon): remove this and use inputPins and outputPins?
	block.outputCount = blockSpec.output_count || 0;
	block.value = blockSpec.value || null;  // null means no defined value
	block.stale = true;  // value needs to be updated
	block.inputType = blockSpec.input_type || 'n';  // default to numeric
	block.outputType = blockSpec.output_type || 'n';  // default to numeric
	block.hasSeq = blockSpec.has_seq || false;  // false if corresponds to physical hardware
	if (blockSpec.id) {
		block.id = blockSpec.id;
	} else {
		block.id = g_nextBlockId;
		g_nextBlockId++;
	}

	block.history = [];
	if (block.value){
		block.history.push(block.value);
	}

	// view-related data is stored in this sub-object
	block.view = {};
	block.view.x = 0;
	block.view.y = 0;
	if (blockSpec.view) {
		block.view.x = blockSpec.view.x || 0;
		block.view.y = blockSpec.view.y || 0;
	}

	// add pins
	for (var i = 0; i < block.inputCount; i++) {
		var pin = createPin(block, i, true);
		block.pins.push(pin);
	}
	for (var i = 0; i < block.outputCount; i++) {
		var pin = createPin(block, i, false);
		block.pins.push(pin);
	}

	// serialize to dictionary (suitable for conversion to JSON)
	block.asSpec = function() {
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
	};

	block.updateValue = function(value){
		this.value = value;
		this.history.push(value);

		if (this.history.length === BLOCK_HISTORY_LIMIT){
			this.history.shift();
		}
	};

	return block;
}


// create a pin object that represents a potential input or output connection for a block
function createPin(block, index, isInput) {
	var pin = {};
	pin.block = block;
	pin.index = index;  // fix(soon): rethink this
	pin.isInput = isInput;
	pin.sourcePin = null;  // the source pin object (if connected)
	pin.view = {};
	pin.view.x = 0;
	pin.view.y = 0;
	return pin;
}


// create a diagram object from a diagram spec dictionary (deserialize a diagram)
function specToDiagram(diagramSpec) {
	var diagram = createDiagram();

	// first pass: create blocks
	for (var i = 0; i < diagramSpec.blocks.length; i++) {
		var blockSpec = diagramSpec.blocks[i];
		var block = createFlowBlock(blockSpec);
		diagram.blocks.push(block);
		if (block.id >= g_nextBlockId) {
			g_nextBlockId = block.id + 1;
		}
	}

	// second pass: create links between blocks (between pins)
	for (var i = 0; i < diagramSpec.blocks.length; i++) {
		var blockSpec = diagramSpec.blocks[i];
		if (blockSpec.sources) {
			var block = diagram.blocks[i];
			for (var j = 0; j < blockSpec.sources.length; j++) {

				// find the source pin (output pin of source block)
				var sourceId = blockSpec.sources[j];
				var sourceBlock = diagram.findBlockById(sourceId);
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
	return diagram;
}


// create a diagram spec dictionary from a diagram object (serialize a diagram)
function diagramToSpec(diagram) {
	var blocks = [];
	for (var i = 0; i < diagram.blocks.length; i++) {
		blocks.push(diagram.blocks[i].asSpec());
	}
	return {'file_version': '0.1', 'blocks': blocks};
}
