//
// Program editor panel.
// The main UI panel for dataflow program editing.
//
var ProgramEditorPanel = function(options) {

    this.m_scale        = null;
    this.m_diagram      = null;
    this.m_diagramName  = null;
    this.m_modified     = null;
    this.m_svgDrawer    = null;

    this.container      = options.container;

    var _this           = this;

    //
    // Drag block state
    //
    this.m_dragBlock        = null;
    this.m_dragBlockOffsetX = null;
    this.m_dragBlockOffsetY = null;

    this.m_activeStartPin   = null;
    this.m_activeLineSvg    = null;

    //
    // Create block palette
    //
    var palDiv = $('<div>', {   id: 'block-palette', 
                                css: {  
                                        position:   'absolute',
                                        zIndex:     100,
                                        border:     '1px solid lightgrey',
                                        width:      '150px' } } );

    var palette = ProgramEditorBlockPalette({   container: palDiv,
                                                programEditorPanel: this });
    this.container.append(palDiv);

    //
    // Create div for svg drawer.
    //
    var svgWrapper = $('<div>', { css: { } });
    var svgDiv = $('<div>', {   id: 'program-holder', 
                                css: {  position:   'absolute',
                                        width:      '100%',
                                        height:     '600px' } } );
    svgWrapper.append(svgDiv);
    this.container.append(svgWrapper);

    //
    // Load a diagram from a spec dictionary into the UI editor
    //
    this.loadProgram = function(programSpec) {

        if(this.m_svgDrawer == null) {
            this.m_svgDrawer = SVG('program-holder');
            $('#program-holder').mousemove(this.mouseMove);
            $('#program-holder').mouseup(this.mouseUp);
        }

        // console.log("[DEBUG] loadProgram", programSpec);

        //
        // bind zoom menu/function to keyboard keys
        //
        $(document).bind('keydown', 'ctrl+i', zoominBlock);
        $(document).bind('keydown', 'ctrl+o', zoomoutBlock);

        if (this.m_diagram) {  // remove any existing diagram elements
            for (var i = 0; i < this.m_diagram.blocks.length; i++) {
                // console.log("[DEBUG] undisplay block", this.m_diagram.blocks[i]);
                this.undisplayBlock(this.m_diagram.blocks[i]);
            }
        }
        m_scale = 1.0;
        m_diagram = specToDiagram(programSpec);
        m_diagramName = programSpec.name;
        //zoomBlocks(this.m_diagram.blocks, this.m_scale);
        for (var i = 0; i < this.m_diagram.blocks.length; i++) {
            // console.log("[DEBUG] display block", this.m_diagram.blocks[i]);
            this.displayBlock(this.m_diagram.blocks[i]);
        }
        for (var i = 0; i < this.m_diagram.blocks.length; i++) {
            var block = this.m_diagram.blocks[i];
            for (var j = 0; j < block.pins.length; j++) {
                var pin = block.pins[j];
                if (pin.sourcePin) {
                    console.log("[DEBUG] displayConnection", pin);
                    this.displayConnection(pin, this.m_scale);
                }
            }
        }
        m_modified = false;
    };

    //
    // Create HTML/DOM elements for a block along with SVG pins.
    //
    this.displayBlock = function(block) {
        var blockDiv = $('<div>', {class: 'flowBlock', id: 'b_' + block.id});
        block.view.div = blockDiv;
        //var scale = block.ctx.scale;
        //var scale = 0.6;

        //
        // Add menu
        //
        var menuData = createMenuData();
        menuData.add('Rename', this.renameBlock, {id: block.id});
        menuData.add('Delete', this.deleteBlock, {id: block.id});
        //menuData.add('Zoom In (Ctrl+i)', zoominBlock, {id: block.id});
        //menuData.add('Zoom Out (Ctrl+o)', zoomoutBlock, {id: block.id});

        //if (block.hasSeq) {
        //    menuData.add('View Recorded Data', viewRecordedData, {id: block.id});
        //}
        var menuHolderDiv = $('<div>', {class: 'flowBlockMenuHolder'});
        var menuDiv = $('<div>', {class: 'dropdown flowBlockMenu'}).appendTo(menuHolderDiv);
        var menuInnerDiv = $('<div>', {
            'class': 'dropdown-toggle',
            'id': 'bm_' + block.id,
            'data-toggle': 'dropdown',
            'aria-expanded': 'true',
        }).appendTo(menuDiv);
        $('<span>', {class: 'flowBlockIcon glyphicon glyphicon-align-justify noSelect', 'aria-hidden': 'true'}).appendTo(menuInnerDiv);
        createDropDownList({menuData: menuData}).appendTo(menuDiv);
        menuHolderDiv.appendTo(blockDiv);

        //
        // add name, value, and units
        //
        if (block.type !== 'plot') {
            $('<div>', {class: 'flowBlockName noSelect', id: 'bn_' + block.id, html: block.name}).appendTo(blockDiv);
        }
        if (block.type === 'number_entry') {
            var input = $('<input>', {class: 'form-control flowBlockInput', type: 'text', id: 'bv_' + block.id}).appendTo(blockDiv);
            if (block.value !== null) {
                input.val(block.value);
            }
            input.mousedown(function(e) {e.stopPropagation()});
            input.keyup(block.id, numberEntryChanged);
        } else if (block.type === 'plot') {
            var canvas = $('<canvas>', {class: 'flowBlockPlot', width: 300, height: 200, id: 'bc_' + block.id}).appendTo(blockDiv);
            canvas.mousedown(this.blockMouseDown);
            canvas.mousemove(this.mouseMove);
            canvas.mouseup(this.mouseUp);
            blockDiv.addClass('flowBlockWithPlot');
        } else if (block.outputType === 'i') {  // image-valued blocks
            $('<img>', {class: 'flowBlockImage', width: 320, height: 240, id: 'bi_' + block.id}).appendTo(blockDiv);
            blockDiv.addClass('flowBlockWithImage');
            this.appendBlockParametersToBlockDiv(block, blockDiv);
        } else {
            var div = $('<div>', {class: 'flowBlockValueAndUnits noSelect'});
            $('<span>', {class: 'flowBlockValue', html: '...', id: 'bv_' + block.id}).appendTo(div);

            // console.log("[DEBUG] units:", block.units);

            if (block.units) {
                var units = block.units;
                units = units.replace('degrees ', '&deg;');  // note removing space
                units = units.replace('percent', '%');
                $('<span>', {class: 'flowBlockUnits', html: ' ' + units}).appendTo(div);
            }
            div.appendTo(blockDiv);
            if (block.type === 'number_display_and_input') {
                this.appendBlockParametersToBlockDiv(block, blockDiv);
            }
        }

        //
        // Position the block as specified
        //
        var x = block.view.x;
        var y = block.view.y;
        x = x * this.m_scale;
        y = y * this.m_scale;
        blockDiv.css('top', y + 'px');
        blockDiv.css('left', x + 'px');

        // console.log("blockDiv: x,y="+x+","+y);

        //
        // Add a mousedown handler for dragging/moving blocks
        //
        blockDiv.mousedown(this.blockMouseDown);

        //
        // Add to DOM before get dimensions
        //
        blockDiv.appendTo($('#program-holder'));

        //
        // Display plot after added to DOM
        //
        if (block.type === 'plot') {
            displayPlot(block);
        }
        this.scaleClasses();

        //
        // Get dimensions of block div
        //
        var w = parseInt(blockDiv.outerWidth(true));  // true to include the margin in the width
        var h = parseInt(blockDiv.outerHeight());  // not passing true here because we don't want the bottom margin

        console.log("[DEBUG] block w,h=" + w + ", " + h);

        block.view.w = w;
        block.view.h = h;

        var pinRadius = 15 * this.m_scale;
        if (pinRadius > 15) {
            pinRadius = 15;
        } else if (pinRadius < 8) {
            pinRadius = 8;
        }

        //
        // Position and draw pins
        //
        for (var i = 0; i < block.pins.length; i++) {
            var pin = block.pins[i];
            if (pin.isInput) {
                if (block.inputCount == 1) {
                    pin.view.offsetX = -5;
                    pin.view.offsetY = h / 2;
                } else {
                    pin.view.offsetX = -5;
                    pin.view.offsetY = h / 4 + h / 2 * pin.index;
                }
            } else {
                pin.view.offsetX = w + 5;
                pin.view.offsetY = (h / 2);
            }
            pin.view.x = x + pin.view.offsetX;
            pin.view.y = y + pin.view.offsetY;
            var pinSvg = this.m_svgDrawer.circle(pinRadius * 2).center(pin.view.x, pin.view.y).attr({fill: '#4682b4'});
            pinSvg.remember('pin', pin);
            pinSvg.mousedown(pinMouseDown);
            pinSvg.mouseup(pinMouseUp);
            pinSvg.mouseover(pinMouseOver);
            pinSvg.mouseout(pinMouseOut);
            pin.view.svg = pinSvg;
        }
    };

    //
    // Remove the HTML/SVG elements associated with a block
    //
    this.undisplayBlock = function(block) {
        $('#b_' + block.id).remove();
        for (var i = 0; i < block.pins.length; i++) {
            var pin = block.pins[i];
            pin.view.svg.remove();
            if (pin.sourcePin) {  // remove connections to this block
                pin.view.svgConn.remove();
            }
        }

        //
        // Remove connections from this block
        //
        var destPins = this.m_diagram.findDestPins(block);
        for (var i = 0; i < destPins.length; i++) {
            destPins[i].view.svgConn.remove();
        }
    };

    //
    // Draw a connection between two blocks (as an SVG line)
    //
    this.displayConnection = function(destPin, scale) {
        var strokeWidth = 10 * scale;
        if (strokeWidth > 10) {
            strokeWidth = 10;
        } else if (strokeWidth < 4) {
            strokeWidth = 4;
        }
        var x1 = destPin.sourcePin.view.x;
        var y1 = destPin.sourcePin.view.y;
        var x2 = destPin.view.x;
        var y2 = destPin.view.y;
        var line = this.m_svgDrawer.line(x1, y1, x2, y2).stroke({width: strokeWidth, color: '#555'}).back();
        line.remember('destPin', destPin);
        line.click(connectionClick);
        destPin.view.svgConn = line;
    };

    //
    //
    //
    this.appendBlockParametersToBlockDiv = function(block, blockDiv) {
        for (var i = 0; i < block.params.length; i++) {
            var param = block.params[i];
            param.value = param['default']; // set value to default value so that we can send a value back to controller if no param entry change
            $('<div>', {class: 'flowBlockParamLabel', html: param.name}).appendTo(blockDiv);
            var input = $('<input>', {class: 'form-control flowBlockInput', type: 'text', id: 'bp_' + param.name, value: param['default']}).appendTo(blockDiv);
            input.mousedown(function(e) {e.stopPropagation()});
            input.keyup(block.id, paramEntryChanged);
        }
    };

    //
    // Scale css classes based on current scale value.
    // Will scale the following css classes:
    // - flowBlockValueAndUnits
    // - flowBlockValue
    // etc. as specified in CLASS_SCALING_TABLE
    //
    this.scaleClasses = function() {
        //
        // adjust css sizing properties based on scale
        //

        // allow reset to exactly 1.0 scale if it's slightly off
        if (this.m_scale > 0.95 && this.m_scale < 1.05) {
            do_reset = true;
            this.m_scale = 1.0;
        } else {
            do_reset = false;
        }
        for (var key in CLASS_SCALING_TABLE) {
          var node = $("." + key)
          if (node) {
            for (var cssProp in CLASS_SCALING_TABLE[key]) {
                var value = node.css(cssProp);
                if (value) {
                    var defaultValue = CLASS_SCALING_TABLE[key][cssProp];
                    var newValue = Math.round(defaultValue * this.m_scale);
                    // append "px" if needed
                    if (value && value.endsWith("px")) {
                        newValue = "" + newValue + "px";
                    }
                    //console.log("scaleClasses: " + key + " - " + cssProp + ": " + value + " -> " + newValue);
                    node.css(cssProp, newValue);
                    //$("." + key).css(cssProp, newValue);
                } else {
                    //console.log("scaleClasses: skipping " + key + " - " + cssProp);
                }
            }
          }
        }
    };

    //
    // Move a block along with its pins and connections
    //
    this.moveBlock = function(block, x, y) {

        //
        // Move block div
        //
        block.view.div.css('top', y + 'px');
        block.view.div.css('left', x + 'px');
        block.view.x = x;
        block.view.y = y;

        //
        // Move pins
        //
        for (var i = 0; i < block.pins.length; i++) {
            var pin = block.pins[i];
            pin.view.x = x + pin.view.offsetX;
            pin.view.y = y + pin.view.offsetY;
            pin.view.svg.center(pin.view.x, pin.view.y);
            if (pin.sourcePin) {
                _this.moveConn(pin);
            }
        }

        //
        // move connections
        //
        var destPins = _this.m_diagram.findDestPins(block);
        for (var i = 0; i < destPins.length; i++) {
            _this.moveConn(destPins[i]);
        }
    };

    //
    // Move a connection between two blocks
    //
    this.moveConn = function(destPin) {
        var x1 = destPin.sourcePin.view.x;
        var y1 = destPin.sourcePin.view.y;
        var x2 = destPin.view.x;
        var y2 = destPin.view.y;
        destPin.view.svgConn.plot(x1, y1, x2, y2);
    };

    //
    // Handle mouse moves in SVG area; move blocks or connections
    //
    this.mouseMove = function(e) {
        // console.log("[DEBUG] mouseMove");
        if (_this.m_activeStartPin) {
            var x1 = _this.m_activeStartPin.view.x;
            var y1 = _this.m_activeStartPin.view.y;
            var x2 = e.pageX;
            var y2 = e.pageY;
            if (_this.m_activeLineSvg) {
                _this.m_activeLineSvg.plot(x1, y1, x2, y2);
            } else {
                _this.m_activeLineSvg = _this.m_svgDrawer.line(x1, y1, x2, y2).stroke({width: 10, color: '#555'}).back();
            }
        }
        if (_this.m_dragBlock) {
            // console.log("[DEBUG] Dragging block.");
            var x = e.pageX;
            var y = e.pageY;
            _this.moveBlock(_this.m_dragBlock, 
                            x + _this.m_dragBlockOffsetX, 
                            y + _this.m_dragBlockOffsetY );
            _this.layoutModified();
        }
    };

    //
    // Call this when the visual appearance of the diagram is changed.
    //
    this.layoutModified = function() {
        _this.m_modified = true;
    };

    //
    // Handle mouse button up in SVG area
    //
    this.mouseUp = function(e) {

        // console.log("[DEBUG] mouseUp");

        _this.m_activeStartPin = null;
        _this.m_dragBlock = null;
        if (_this.m_activeLineSvg) {
            _this.m_activeLineSvg.remove();
            _this.m_activeLineSvg = null;
        }
    };

    //
    // Drag a block div
    //
    this.blockMouseDown = function(e) {
        var x = e.pageX;
        var y = e.pageY;

        //
        // Identify and store block
        //
        for (var i = 0; i < _this.m_diagram.blocks.length; i++) {
            var block = _this.m_diagram.blocks[i];
            var view = block.view;
            if (x >= view.x && x <= view.x + view.w && y >= view.y && y <= view.y + view.h) {
                // console.log("[DEBUG] moving block", block);
                _this.m_dragBlock = block;
                _this.m_dragBlockOffsetX = view.x - x;
                _this.m_dragBlockOffsetY = view.y - y;
            }
        }
    };

    //
    // Rename a block (using the block menu)
    //
    this.renameBlock = function(e) {
        var block = _this.m_diagram.findBlockById(e.data.id);
        if (block) {
            modalPrompt({
                title: 'Rename Block',
                prompt: 'New Name',
                default: block.name,
                validator: Util.diagramValidator,
                resultFunc: function(newName) {
                    block.name = newName;
                    $('#bn_' + block.id).html(newName);
                }
            });
        }
    };

    //
    // Delete a block (using the block menu)
    //
    this.deleteBlock = function(e) {
        var block = _this.m_diagram.findBlockById(e.data.id);
        if (block) {
            _this.undisplayBlock(block);        // remove UI elements
            _this.m_diagram.removeBlock(block);
        }
    };

    //
    // Display a dialog with a list of allowed filter types
    //
    this.showFilterBlockSelector = function() {
        var modal = createBasicModal('filterModal', 'Select a Filter', {infoOnly: true});
        modal.appendTo($('body'));
        var modalBody = $('#filterModal-body');
        var filterTypes = [
            "not", "and", "or", "xor", "nand",
            "plus", "minus", "times", "divided by", "absolute value",
            "equals", "not equals", "less than", "greater than",
            "simple moving average", "exponential moving average"
        ];
        for (var i = 0; i < filterTypes.length; i++) {
            var type = filterTypes[i];
            var button = $('<button>', {html: type, class: 'btn filter'});
            button.click(type, this.addFilterBlock);
            button.appendTo(modalBody);
        }
        $('#filterModal').modal('show');
    };

    //
    // Add a filter block to the diagram
    //
    this.addFilterBlock = function(e) {
        var type = e.data;
        $('#filterModal').modal('hide');
        var blockSpec = {
            name: type,
            type: type,
            input_count: 2,
            output_count: 1,
            input_type: 'n',
            output_type: 'n',
        }
        if (type === 'not' || type == 'absolute value') {
            blockSpec.input_count = 1;
        }
        if (type === 'simple moving average'|| type === 'exponential moving average') {
            blockSpec.input_count = 1;
            blockSpec.type = "number_display_and_input"
            blockSpec.params = [{
                'name': 'period',
                'type': 'n',
                'min': 0,
                'max': 9999,
                'default': 10
            }];
        }
        if (type === 'blur' || type === 'brightness') {  // fix(soon): get this from controller block type spec list
            blockSpec.input_type = 'i';
            blockSpec.output_type = 'i';
            blockSpec.input_count = 1;
            if (type === 'blur') {
                blockSpec.params = [{
                    'name': 'blur_amount',
                    'type': 'n',
                    'min': 0,
                    'max': 50,
                    'default': 5,
                }];
            } else {
                blockSpec.params = [{
                    'name': 'brightness_adjustment',
                    'type': 'n',
                    'min': -100,
                    'max': 100,
                    'default': 0,
                }];
            }
        }
        var block = createFlowBlock(blockSpec);  // fix(soon): generate unique name from type
        _this.m_diagram.blocks.push(block);
        block.view.x = 300;
        block.view.y = 200;
        _this.displayBlock(block);
    };


    return this;
}

