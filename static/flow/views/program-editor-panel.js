//
// Program editor panel.
// The main UI panel for dataflow program editing.
//
var ProgramEditorPanel = function(options) {
    this.m_scale        = null;
    this.m_diagram      = null;
    this.m_diagramName  = null;
    this.m_diagramDisplayedName  = null;
    this.m_modified     = null;
    this.m_svgDrawer    = null;

    this.container      = options.container;
    this.menuholderdiv      = options.menuholderdiv;
    this.menuandcontentdiv  = options.menuandcontentdiv;
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

    var palette = ProgramEditorBlockPalette({   container: menuholderdiv,
                                                parentcontainer: menuandcontentdiv,
                                                programEditorPanel: this });


    //
    // Create div for svg drawer
    //
    
    var svgWrapper = $('<div>', { css: { } });
    var svgDiv = $('<div>', { class: 'diagramSvgHolder',  id: 'program-holder'} );
    svgWrapper.append(svgDiv);
    this.container.append(svgWrapper);
    var holderoffsetx = 170;
    var holderoffsety = 70;
    
    //recording/running program
    var m_runningProgram = false;
    
    //
    // Return current diagram
    //
    this.getDiagram = function() { return this.m_diagram; }
    
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
        
        //handle mouseup to stop moving blocks when outside of the program canvas area
        $('#program-editor-view').mouseup(this.mouseUp);

        //
        // Maintain set of block names
        //
        this.nameHash = {};

        //
        // Default empty program
        //
        if(!programSpec) {
            $('#program-editor-filename').val("untitled program");
            programSpec = { blocks: [] };
            programSpec.name = this.chooseProgramName();
            programSpec.displayedName = "untitled program";
        }
        else if(programSpec.name == null || programSpec.name == ""){
            // if we loaded a program copy stored in dataset metadata,
            // or if the name value is null or undefined
            // then it might not have a valid file name
            programSpec.name = this.chooseProgramName();
        }

        //
        // bind zoom menu/function to keyboard keys, WIP: need to potentially hook this back up
        //
        //$(document).bind('keydown', 'ctrl+i', zoominBlock);
        //$(document).bind('keydown', 'ctrl+o', zoomoutBlock);

        if (this.m_diagram) {  // remove any existing diagram elements
            for (var i = 0; i < this.m_diagram.blocks.length; i++) {
                // console.log("[DEBUG] undisplay block", this.m_diagram.blocks[i]);
                this.undisplayBlock(this.m_diagram.blocks[i]);
            }
        }

        this.m_scale = 1.0;
        this.m_diagram = specToDiagram(programSpec);
        this.m_diagramName = programSpec.name;
        this.m_diagramDisplayedName = programSpec.displayedName;

        //zoomBlocks(this.m_diagram.blocks, this.m_scale);

        //
        // Display blocks
        //
        for (var i = 0; i < this.m_diagram.blocks.length; i++) {
            // console.log("[DEBUG] display block", this.m_diagram.blocks[i]);
            var block = this.m_diagram.blocks[i];
            this.displayBlock(block);
            this.nameHash[block.name] = block;
        }

        //
        // Display connections
        //
        for (var i = 0; i < this.m_diagram.blocks.length; i++) {
            var block = this.m_diagram.blocks[i];
            for (var j = 0; j < block.pins.length; j++) {
                var pin = block.pins[j];
                if (pin.sourcePin) {
                    // console.log("[DEBUG] displayConnection", pin);
                    this.displayConnection(pin, this.m_scale);
                }
            }
        }

        m_modified = false;
    };

    this.chooseProgramName = function(){
        var d = new Date();
        var year = d.getFullYear();
        var month = d.getMonth() + 1;
        var day = d.getDate();
        var hour = d.getHours();
        var min = d.getMinutes();
        var sec = d.getSeconds();
        
        var potentialName = "program_" + year;
        if(month < 10)
            potentialName = potentialName + "0" + month;
        else
            potentialName = potentialName + month;
        if(day < 10)
            potentialName = potentialName + "0" + day + "_";
        else
            potentialName = potentialName + day + "_";
        if(hour < 10)
            potentialName = potentialName + "0" + hour;
        else
            potentialName = potentialName + hour;
        if(min < 10)
            potentialName = potentialName + "0" + min;
        else
            potentialName = potentialName + min;
        if(sec < 10)
            potentialName = potentialName + "0" + sec;
        else
            potentialName = potentialName + sec;
        
        return potentialName;
    }
    
    this.getProgramName = function(){
        return this.m_diagramName;
    }
    
    //
    // Create HTML/DOM elements for a block along with SVG pins.
    //
    this.displayBlock = function(block) {

        var blockDiv = $('<div>', {class: 'flowBlock', id: 'b_' + block.id});
        block.view.div = blockDiv;
        if (block.type === 'exponential moving average' || block.type === 'simple moving average') {// if (block.type === 'number_display_and_input') {
             blockDiv.addClass('flowBlockTallWide');
        }
        else if (block.type === 'timer') {
             blockDiv.addClass('flowBlockTimer');
        }
        else if (block.type === 'data storage') {
             blockDiv.addClass('flowBlockData');
        }
        else if (block.type === 'plot') {
             blockDiv.addClass('flowBlockPlot');
        }
        
        var blockContentDiv;
        
        if(_this.isDeviceBlock(block.type)) {
            blockDiv.addClass('concordblue');
            blockContentDiv = $('<div>', {class: 'flowBlockContent', id: 'bcon_' + block.id});
        }
        else if(_this.isFilterBlock(block.type)) {
            blockDiv.addClass('concordgreen');
            blockContentDiv = $('<div>', {class: 'flowBlockContent', id: 'bcon_' + block.id});
        }
        else if (block.type === 'number_entry') {
            blockDiv.addClass('concordgreen');
            blockContentDiv = $('<div>', {class: 'flowBlockContent', id: 'bcon_' + block.id});
        }    
        else if (block.type === 'relay') {
            blockDiv.addClass('concordorange');
            blockContentDiv = $('<div>', {class: 'flowBlockContent', id: 'bcon_' + block.id});
        }            
        else if (block.type === 'timer') {
            blockDiv.addClass('complimentaryviolet');
            blockContentDiv = $('<div>', {class: 'flowBlockContent flowBlockContentTimer', id: 'bcon_' + block.id});
        }  
        else if (block.type === 'data storage') {
            blockDiv.addClass('concordorange');
            blockContentDiv = $('<div>', {class: 'flowBlockContent flowBlockContentData', id: 'bcon_' + block.id});
            
            //adjust the size based on the number of connected pins
            var newDivHeight = 142 + (block.inputCount-1) * 36; 
            blockDiv.css('height', newDivHeight + 'px');
            blockContentDiv.css('height', newDivHeight + 'px');
            
        }                  
        else if (block.type === 'exponential moving average' || block.type === 'simple moving average') {//else if (block.type === 'number_display_and_input') {
            blockDiv.addClass('concordgreen');
            blockContentDiv = $('<div>', {class: 'flowBlockContent flowBlockContentTallWide', id: 'bcon_' + block.id});
        }
        else if (block.type === 'plot') {
            blockDiv.addClass('concordorange');
            blockContentDiv = $('<div>', {class: 'flowBlockContent flowBlockContentPlot', id: 'bcon_' + block.id});
        }        
        else {
            blockDiv.addClass('concordlightblue');
            blockContentDiv = $('<div>', {class: 'flowBlockContent', id: 'bcon_' + block.id});
        }
        blockContentDiv.appendTo(blockDiv);
        
        //
        // Add menu
        //
        var menuData = createMenuData();
        if(!_this.isFilterBlock(block.type) && block.type!="plot") {
            menuData.add('Rename', this.renameBlock, {id: block.id});
        }
        //menuData.add('Add Plot', this.addPlotBlock, {id: block.id});
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
    
        $('<span>', {class: 'flowBlockIcon glyphicon glyphicon-chevron-down noSelect', 'aria-hidden': 'true'}).appendTo(menuInnerDiv);
  
        createDropDownList({menuData: menuData}).appendTo(menuDiv);
        menuHolderDiv.appendTo(blockContentDiv);
        
        //
        // add name, value, and units
        //
        if (block.type !== 'plot') {
            var namediv = $('<div>', {class: 'flowBlockName flowBlockNameNormal noSelect', id: 'bn_' + block.id, html: block.name});
            namediv.appendTo(blockContentDiv);
        }

        if (block.type === 'number_entry') {
            var input = $('<input>', {class: 'form-control flowBlockInput', type: 'text', id: 'bv_' + block.id}).appendTo(blockContentDiv);
            if (block.value !== null) {
                input.val(block.value);
            }
            input.mousedown(function(e) {e.stopPropagation()});
            input.keyup(block.id, _this.numberEntryChanged);
        } else if (block.type === 'plot') {
            var canvas = $('<canvas>', {class: 'flowBlockPlotCanvas', id: 'bc_' + block.id}).appendTo(blockContentDiv);
            canvas.mousedown(this.blockMouseDown);
            canvas.mousemove(this.mouseMove);
            canvas.mouseup(this.mouseUp);
        } else if (block.outputType === 'i') {  // image-valued blocks
            $('<img>', {class: 'flowBlockImage', width: 320, height: 240, id: 'bi_' + block.id}).appendTo(blockDiv);
            blockDiv.addClass('flowBlockWithImage');
            this.appendBlockParametersToBlockDiv(block, blockDiv);
        } else {
            var div = $('<div>', {class: 'flowBlockValueAndUnits noSelect'});
            var initval = "...";
            if (block.type === "data storage"){
                initval = "";
            }    
            var span = $('<span>', {class: 'flowBlockValue', html: initval, id: 'bv_' + block.id});
            span.appendTo(div);
            // console.log("[DEBUG] units:", block.units);

            if (block.units && block.type != 'timer') {
                // console.log("[DEBUG] Fixing units:", block.units);
                var units = block.units;
                units = units.replace('degrees ', '&deg;');  // note removing space
                units = units.replace('percent', '%');
                $('<span>', {class: 'flowBlockUnits', html: ' ' + units}).appendTo(div);
            }
        
            div.appendTo(blockContentDiv);
            
            if (block.type === 'exponential moving average' || block.type === 'simple moving average' || block.type === 'timer' || block.type === 'data storage') {//if (block.type === 'number_display_and_input') {
                namediv.addClass('flowBlockNameLong');
                var divdivider = $('<div>', {css:{backgroundColor:'FFFFFF'}, width:182, height:1});
                divdivider.addClass('noSelect flowBlockInputHolderMargin');
                divdivider.appendTo(blockContentDiv);
                var divflowBlockInputHolder = $('<div>', {class: 'flowBlockInputHolder flowBlockInputHolderMargin'});
                divflowBlockInputHolder.appendTo(blockContentDiv);

                var divflowBlockInputHolder2 = $('<div>', {class: 'flowBlockInputHolder flowBlockInputHolderMargin'});
                var divflowBlockInputHolder3 = $('<div>', {class: 'flowBlockInputHolder flowBlockInputHolderMargin ephemeralDiv'});
            if(block.type === 'data storage' || block.type === 'timer'){
                    divflowBlockInputHolder2.appendTo(blockContentDiv);
                }
                    
                //this.appendBlockParametersToBlockDiv(block, divflowBlockInputHolder);
                                
                for (var i = 0; i < block.params.length; i++) {
                    var param = block.params[i];                
                    var initval = param.value;
                    var displayedParamName = param.name;
                    var input;
                    var divindex = 1;
                    if(param.name=="period"){
                        displayedParamName = "last";
                        $('<div>', {class: 'flowBlockParamLabel noSelect', html: displayedParamName}).appendTo(divflowBlockInputHolder);                    
                        input = $('<input>', {class: 'form-control flowBlockInput', type: 'text', id: 'b' + block.id + '_bp_' + param.name, value: initval}).prependTo(divflowBlockInputHolder);
                    }
                    else if(param.name=="recording_interval"){
                        displayedParamName = "interval";
                        $('<div>', {class: 'flowBlockParamLabel noSelect', html: displayedParamName}).appendTo(divflowBlockInputHolder);                    
                        input = $('<input>', {class: 'form-control flowBlockInput', type: 'text', id: 'b' + block.id + '_bp_' + param.name, value: initval}).prependTo(divflowBlockInputHolder);
                    }
                    else if(param.name=="dataset_location"){
                        displayedParamName = "name";
                        $('<div>', {class: 'flowBlockParamLabel noSelect', html: displayedParamName}).appendTo(divflowBlockInputHolder2);                    
                        input = $('<input>', {class: 'form-control flowBlockInput flowBlockInputLong', type: 'text', id: 'b' + block.id + '_bp_' + param.name, value: initval}).prependTo(divflowBlockInputHolder2);
                    }
                    else if(param.name=="sequence_names"){
                        //if loading from file, this might be populated
                        paramKeyArray = Object.keys(param.value);
                        paramValueArray = Object.values(param.value);
                        displayedParamName = "type";
                        
                        for(var p = 0; p < block.pins.length; p++){
                            if(block.pins[p].sourcePin!=null){
                                var connectedblockid = block.pins[p].sourcePin.block.id;
                                
                                for(var x = 0; x < (paramKeyArray.length); x++){
                                    if(connectedblockid == paramKeyArray[x]){
                                        initval = paramValueArray[x];
                                        break;
                                    }
                                }
                                //make a new div to show sequence info
                                var divflowBlockInputHolderEphemeral = $('<div>', {class: 'flowBlockInputHolder flowBlockInputHolderMargin ephemeralDiv'});
                                divflowBlockInputHolderEphemeral.appendTo(blockContentDiv);
                                
                                $('<div>', {class: 'flowBlockParamLabel noSelect', html: displayedParamName}).appendTo(divflowBlockInputHolderEphemeral);    
                                var divindexephemeral = x+1;                                        
                                var inputephemeral = $('<input>', {class: 'form-control flowBlockInput flowBlockInputLong', type: 'text', id: 'b' + block.id + '_bp_' + "sequence_names" + divindexephemeral, value: initval}).prependTo(divflowBlockInputHolderEphemeral);
                                
                                inputephemeral.mousedown(function(e) {e.stopPropagation()});
                                var eventdataephemeral = {blockid:block.id, paramname: "sequence_names", connectedblockid:connectedblockid, divindex:divindexephemeral };
                                inputephemeral.keyup(eventdataephemeral, _this.paramEntryChanged);
                                inputephemeral.focusout(eventdata, _this.paramEntryFocusOut);
                            }
                        }
                 
                        divflowBlockInputHolder3.appendTo(blockContentDiv);
                        $('<div>', {class: 'flowBlockParamLabel noSelect', html: displayedParamName}).appendTo(divflowBlockInputHolder3);   
                        initval = "";//"data type" + (paramValueArray.length + 1);
                        divindex = paramValueArray.length + 1;
                        input = $('<input>', {class: 'form-control flowBlockInput flowBlockInputLong', type: 'text', id: 'b' + block.id + '_bp_' + param.name + (paramValueArray.length + 1), value: initval}).prependTo(divflowBlockInputHolder3);
        
                        
                    }                    
                    else if(param.name=="seconds_off"){
                        displayedParamName = "seconds off";
                        $('<div>', {class: 'flowBlockParamLabel noSelect', html: displayedParamName}).appendTo(divflowBlockInputHolder2);                    
                        input = $('<input>', {class: 'form-control flowBlockInput', type: 'text', id: 'b' + block.id + '_bp_' + param.name, value: initval}).prependTo(divflowBlockInputHolder2);
                    }
                    else if(param.name=="seconds_on"){
                        displayedParamName = "seconds on";
                        $('<div>', {class: 'flowBlockParamLabel noSelect', html: displayedParamName}).appendTo(divflowBlockInputHolder);                    
                        input = $('<input>', {class: 'form-control flowBlockInput', type: 'text', id: 'b' + block.id + '_bp_' + param.name, value: initval}).prependTo(divflowBlockInputHolder);

                    }
                    else{ 
                        continue;
                    }
                                
                    input.mousedown(function(e) {e.stopPropagation()});
                    var eventdata = {blockid:block.id, paramname: param.name, connectedblockid:-1, divindex:divindex};
                    input.keyup(eventdata, _this.paramEntryChanged);
                    input.focusout(eventdata, _this.paramEntryFocusOut);
                }                    
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
        block.view.x = x;
        block.view.y = y;

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
        //this.scaleClasses(); WIP WIP WIP not using zoom

        //
        // Get dimensions of block div
        //
        var w = parseInt(blockDiv.outerWidth(true));  // true to include the margin in the width
        var h = parseInt(blockDiv.outerHeight());  // not passing true here because we don't want the bottom margin
        var blockpos = blockDiv.position();
        var blockposleft = blockpos.left;
        var blockpostop = blockpos.top;
        //console.log("[DEBUG] block t,l=" + blockpostop + ", " + blockposleft);
        // console.log("[DEBUG] block w,h=" + w + ", " + h);

        block.view.w = w;
        block.view.h = h;


        var pinRadius = 10 * this.m_scale;
        if (pinRadius > 15) {
            pinRadius = 15;
        } else if (pinRadius < 5) {
            pinRadius = 5;
        }
        //
        // Position and draw pins
        //
        for (var i = 0; i < block.pins.length; i++) {
            var pin = block.pins[i];
            if (pin.isInput) {
                if(block.type==="data storage"){
                    pin.view.offsetX = -4;
                    pin.view.offsetY = 124 + (36*i);
                }
                else{
                    if (block.inputCount == 1) {
                        pin.view.offsetX = -4;
                        pin.view.offsetY = h / 2;
                    } 
                    else if (block.inputCount == 2) {
                        pin.view.offsetX = 0;
                        pin.view.offsetY = h / 10 + (4 * h) / 5 * pin.index;
                    }
                    else if (block.inputCount == 3) {
                        pin.view.offsetX = 0;
                        pin.view.offsetY = h / 10 + (2 * h) / 5 * pin.index;
                    }
                }

            } else {
                pin.view.offsetX = w + 4;
                pin.view.offsetY = (h / 2);
            }
            pin.view.x = x + pin.view.offsetX;
            pin.view.y = y + pin.view.offsetY;
            var pinSvg = this.m_svgDrawer.circle(pinRadius * 2).center(pin.view.x, pin.view.y).attr({fill: '#808080'});
            pinSvg.remember('pin', pin);
            pinSvg.mousedown(this.pinMouseDown);
            pinSvg.mouseup(this.pinMouseUp);
            pinSvg.mouseover(this.pinMouseOver);
            pinSvg.mouseout(this.pinMouseOut);
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
        /* 
        //WIP maybe obsolete?
        var strokeWidth = 3 * scale;
        if (strokeWidth > 6) {
            strokeWidth = 6;
        } else if (strokeWidth < 2) {
            strokeWidth = 2;
        }
        */
        var x1 = destPin.sourcePin.view.x;
        var y1 = destPin.sourcePin.view.y;
        var x2 = destPin.view.x;
        var y2 = destPin.view.y;
        var line = this.m_svgDrawer.line(x1, y1, x2, y2).stroke({width: 3, color: '#808080'}).back();
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
            //param.value = param['default']; // set value to default value so that we can send a value back to controller if no param entry change
    
            var initval = param.value;
            var displayedParamName = param.name;
            if(param.name=="period"){
                displayedParamName = "last";
            }
            else if(param.name=="recording_interval"){
                displayedParamName = "interval";
            }
            else if(param.name=="dataset_location"){
                displayedParamName = "name";
            }
            else if(param.name=="seconds_off"){
                displayedParamName = "off";
            }
            else if(param.name=="seconds_on"){
                displayedParamName = "on";
            }
            else{ //if we don't recognize it, skip it for now
                continue;
            }
            $('<div>', {class: 'flowBlockParamLabel noSelect', html: displayedParamName}).appendTo(blockDiv);
            if(i==0)
                var input = $('<input>', {class: 'form-control flowBlockInput', type: 'text', id: 'b' + block.id + '_bp_' + param.name, value: initval}).appendTo(blockDiv);
            else
                var input = $('<input>', {class: 'form-control flowBlockInput', type: 'text', id: 'b' + block.id + '_bp_' + param.name, value: initval}).prependTo(blockDiv);

            input.mousedown(function(e) {e.stopPropagation()});
            var eventdata = {blockid:block.id, paramname: param.name};
            input.keyup(eventdata, _this.paramEntryChanged);
            input.focusout(eventdata, _this.paramEntryFocusOut);
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
        if(m_runningProgram)
            return;
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
            pin.view.svg.front();
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
            x2 = x2 - holderoffsetx;
            y2 = y2 - holderoffsety;
            if (_this.m_activeLineSvg) {
                _this.m_activeLineSvg.plot(x1, y1, x2, y2);
            } else {
                _this.m_activeLineSvg = _this.m_svgDrawer.line(x1, y1, x2, y2).stroke({width: 3, color: '#808080'}).back();
            }
        }
        if (_this.m_dragBlock) {
            //console.log("[DEBUG] Dragging block.");
            var x = e.pageX;
            var y = e.pageY;
            
            //bounds check to prevent dragging over UI/UX
            if((x + _this.m_dragBlockOffsetX)<holderoffsetx){
                x = holderoffsetx - _this.m_dragBlockOffsetX;            
            }
            if((y + _this.m_dragBlockOffsetY)<holderoffsety){
                y = holderoffsety - _this.m_dragBlockOffsetY;            
            }

            x = x - holderoffsetx;
            y = y - holderoffsety;
            
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
         //console.log("[DEBUG] mouseUp");
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
        //console.log("[DEBUG] blockMouseDown at", e.pageX, e.pageY);
        var mousex = e.pageX;
        var mousey = e.pageY;
        //console.log("[DEBUG] holderoffsets", holderoffsetx, holderoffsety);
        mousex = mousex - holderoffsetx;
        mousey = mousey - holderoffsety;
        //console.log("[DEBUG] adjusted blockMouseDown", x, y);
        //
        // Identify and store block
        //
        for (var i = 0; i < _this.m_diagram.blocks.length; i++) {
            var block = _this.m_diagram.blocks[i];
            var view = block.view;
            //console.log("[DEBUG] trying to move this block", view.x, view.y);
            var blockx = block.view.x;
            var blocky = block.view.y;
            //blockx = blockx * _this.m_scale;
            //blocky = blocky * _this.m_scale;
            if (mousex >= blockx && mousex <= blockx + view.w && mousey >= blocky && mousey <= blocky + view.h) {
                 //console.log("[DEBUG] moving block", block);
                _this.m_dragBlock = block;
                _this.m_dragBlockOffsetX = blockx - mousex;
                _this.m_dragBlockOffsetY = blocky - mousey;
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
            delete _this.nameHash[block.name];
        }
        //update any blocks that this action may affect
        _this.updateAllBlocks();
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
            "moving average", "exp moving average"
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
    // Handle mouse down in pin SVG element
    //
    this.pinMouseDown = function(e) {
         //console.log("[DEBUG] pinMouseDown this", this);
        _this.m_activeStartPin = this.remember('pin');
    };

    //
    // Handle mouse up in pin SVG; create a new connection between blocks
    //
    this.pinMouseUp = function(e) {
        //console.log("[DEBUG] pinMouseUp this", this);
        var endPin = this.remember('pin');
        var startPin = _this.m_activeStartPin;
        if (startPin.isInput != endPin.isInput) {
            
            //no duplicate connections on data storage block
            if(endPin.block.type === "data storage"){
                for(var i = 0; i < endPin.block.pins.length; i++){
                    if(endPin.block.pins[i].sourcePin == startPin){
                        return;
                    }
                }
            }
            
            var sourcePin = endPin.isInput ? startPin : endPin;
            var destPin = endPin.isInput ? endPin : startPin;
            if (!destPin.sourcePin) {  // fix(later): remove existing connection and create new one
                destPin.sourcePin = sourcePin;
                _this.displayConnection(destPin, _this.m_scale);
            }
            _this.m_activeStartPin = null;
            _this.m_activeLineSvg.remove();
            _this.m_activeLineSvg = null;
            
            //update any blocks that this action may affect
            _this.updateAllBlocks();

            // CodapTest.logTopic('Dataflow/ConnectBlock');
        }
    };

    //
    // Highlight a pin when move mouse over it
    //
    this.pinMouseOver = function(e) {
        // console.log("[DEBUG] pinMouseOver this", this);
        this.fill({color: '#313131'})
    };

    //
    // Unhighlight a pin
    //
    this.pinMouseOut = function(e) {
        // console.log("[DEBUG] pinMouseOut this", this);
        this.fill({color: '#808080'})
    };

    //
    // Remove a connection by clicking on it; attached to connection SVG
    //
    this.connectionClick = function(e) {
        // console.log("[DEBUG] connectionClick this", this);
        var destPin = this.remember('destPin');
        destPin.sourcePin = null;
        destPin.view.svgConn.remove();
        
        //update any blocks that this action may affect
        _this.updateAllBlocks();
    };

    //
    // Mapping used by addDeviceBlock() for sensor type units.
    //
    this.unitsMap = {
        humidity:       'percent',
        temperature:    'degrees C',
        CO2:            'PPM',
        light:          'lux',
        soilmoisture:   '',
        timer:          'seconds',
        O2:             'percent'
    };

    //
    // Used by addDeviceBlock() to create unique names
    //
    this.nameHash = {};

    //
    // Determine if a block represents a physical sensor device
    //
    this.isDeviceBlock = function(type) {
        return (type == "temperature" ||
                type == "humidity" ||
                type == "light" ||
                type == "soilmoisture" ||
                type == "CO2" ||
                type == "O2");
    };

    //
    // Determine if a block represents a filter
    //
    this.isFilterBlock = function(type) {
        return (type == "and" ||
                type == "or" ||
                type == "not" ||
                type == "xor" ||
                type == "nand" ||
                type == "plus" ||
                type == "minus" ||
                type == "times" ||
                type == "divided by" ||
                type == "absolute value" ||
                type == "equals" ||
                type == "not equals" ||
                type == "less than" ||
                type == "greater than");
    };
    
    //
    // Used by addDeviceBlock() to create unique names
    //
    this.getUniqueName = function(name) {
    
        var block = this.nameHash[name];
        if(!block) {
            return name;
        }
        var count = 2;
        while(this.nameHash[name + count]) { 
            count++;
        }
        return name + count;
    };

    //
    // Add a block of the specified type to the program.
    //
    this.addDeviceBlock = function(type) {

        var offsetx = _this.newBlockXOffset();
        var offsety = _this.newBlockYOffset();

        var name = _this.getUniqueName(type);

        var blockSpec = {
            name:           name,
            type:           type,
            units:          _this.unitsMap[type],
            has_seq:        true, // assume all inputs have sequences (for now)?
            input_type:     null,
            input_count:    0,
            output_type:    'n',
            output_count:   1,
            view: {
                x: 35 + offsetx,  // fix(later): smarter positioning
                y: 35 + offsety,
            }
        };
        var block = createFlowBlock(blockSpec);
        _this.m_diagram.blocks.push(block);
        _this.nameHash[name] = block;
        _this.displayBlock(block);
        CodapTest.logTopic('Dataflow/ConnectSensor');
    };
    
    this.newBlockXOffset = function() {
        numb = (_this.m_diagram.blocks.length);
        if(numb >= 72){
            numb = numb%72;
        }
        var r =  Math.floor((numb)/18);
        var c =  (numb)%18;
        var offset = r * 250 + c * 5;
        return offset;
    }
    this.newBlockYOffset = function() {
        numb = (_this.m_diagram.blocks.length);
        if(numb >= 72){
            numb = numb%72;
        }
        var c =  (numb)%18;
        var offset = c * 35;
        return offset;
    }    
    
    //
    // Add a relay block to the diagram
    //
    this.addRelayBlock = function(type) {
        var offsetx = _this.newBlockXOffset();
        var offsety = _this.newBlockYOffset();

        
        var name = _this.getUniqueName(type);

        var blockSpec = {
            name:           name,
            type:           type,
            units:          _this.unitsMap[type], //unsure???
            has_seq:        false, // unsure???
            input_type:     'n',
            input_count:    1,
            output_type:    null,
            output_count:   0,
            view: {
                x: 35 + offsetx,  // fix(later): smarter positioning
                y: 35 + offsety,
            }
        };
        var block = createFlowBlock(blockSpec);
        _this.m_diagram.blocks.push(block);
        _this.nameHash[name] = block;
        _this.displayBlock(block);
        //CodapTest.logTopic('Dataflow/ConnectSensor');        
    };
 

    //
    // Add a data bucket block to the diagram
    //
    this.addDataStorageBlock = function(type) {
        type = "data storage";
        var dataStorageBlockAllowed = true;
        //check if there is an exising data storage block
        for (var i = 0; i < _this.m_diagram.blocks.length; i++) {
            var block = _this.m_diagram.blocks[i];
            if(block.type=="data storage") {
                dataStorageBlockAllowed = false;
            }
        }    
        if(!dataStorageBlockAllowed) {
            alert("Only one data storage block allowed per program.");
            return;
        }        
        
        var offsetx = _this.newBlockXOffset();
        var offsety = _this.newBlockYOffset();

        var name = _this.getUniqueName("data storage");

        var blockSpec = {
            name:           name,
            type:           type,
            has_seq:        false, // unsure???
            input_type:     'n',
            input_count:    1,
            output_type:    null,
            output_count:   0,
            view: {
                x: 35 + offsetx,  // fix(later): smarter positioning
                y: 35 + offsety,
            }
        };    
        var displayedFilename = jQuery('#program-editor-filename').val();
        var potentialName = displayedFilename + " dataset";
        
        blockSpec.params = [{
           'name': 'recording_interval',
           'value': 1,
           'default': 1
        },
        {
            'name': 'dataset_location',
            'value': potentialName,
            'default': "mydataset"
        },
        {
            'name': 'sequence_names',
            'value': {
            }
        }];    
        
        var block = createFlowBlock(blockSpec);
        _this.m_diagram.blocks.push(block);
        _this.nameHash[name] = block;
        _this.displayBlock(block);
        //CodapTest.logTopic('Dataflow/ConnectSensor');        
    };

    //
    // get a dataset name based on the current date and time
    //
    this.chooseDatasetDateTimeName = function(name) {
        var d = new Date();
        var year = d.getFullYear();
        var month = d.getMonth() + 1;
        var day = d.getDate();
        var hour = d.getHours();
        var min = d.getMinutes();
        var sec = d.getSeconds();
        
        var potentialName = "ds" + year;
        if(month < 10)
            potentialName = potentialName + "0" + month;
        else
            potentialName = potentialName + month;
        if(day < 10)
            potentialName = potentialName + "0" + day + "_";
        else
            potentialName = potentialName + day + "_";
        if(hour < 10)
            potentialName = potentialName + "0" + hour;
        else
            potentialName = potentialName + hour;
        if(min < 10)
            potentialName = potentialName + "0" + min;
        else
            potentialName = potentialName + min;
        if(sec < 10)
            potentialName = potentialName + "0" + sec;
        else
            potentialName = potentialName + sec;    
        
        return potentialName;
    };

    
    //
    // Add a timer block to the diagram
    //
    this.addTimerBlock = function(type) {
        var offsetx = _this.newBlockXOffset();
        var offsety = _this.newBlockYOffset();

        
        var name = _this.getUniqueName(type);

        var blockSpec = {
            name:           name,
            type:           type,
            units:          _this.unitsMap[type], //unsure???
            has_seq:        false, // unsure???
            input_type:     null,
            input_count:    0,
            output_type:    'n',
            output_count:   1,
            view: {
                x: 35 + offsetx,  // fix(later): smarter positioning
                y: 35 + offsety,
            }
        };
        blockSpec.params = [{
           'name': 'seconds_on',
           'value': 5,
           'default': 5
        },
        {
           'name': 'seconds_off',
           'value': 5,
           'default': 5
        }];         
        var block = createFlowBlock(blockSpec);
        _this.m_diagram.blocks.push(block);
        _this.nameHash[name] = block;
        _this.displayBlock(block);
        //CodapTest.logTopic('Dataflow/ConnectSensor');        
    };
    

    //
    // Add a filter block to the diagram
    //
    this.addFilterBlock = function(e) {
        var offsetx = _this.newBlockXOffset();
        var offsety = _this.newBlockYOffset();
        
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
        if (type === 'moving average'|| type === 'exp moving average') {
            if (type === 'exp moving average'){
                blockSpec.name = "exp moving average";
                blockSpec.type = "exponential moving average";
            }
            else if(type === 'moving average'){
                 blockSpec.type = "simple moving average";
            }
            blockSpec.input_count = 1;
            //blockSpec.type = "number_display_and_input";
            blockSpec.params = [{
                'name': 'period',
                'type': 'n',
                'min': 0,
                'max': 9999,
                'value': 10,
                'default': 10
            }];
            blockSpec.boxSize = 10; //set a default size
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
        var offset = _this.m_diagram.blocks.length * 35;
        var block = createFlowBlock(blockSpec);  // fix(soon): generate unique name from type
        _this.m_diagram.blocks.push(block);
        block.view.x = 35 + offsetx;
        block.view.y = 35 + offsety;
        _this.displayBlock(block);
    };


    //
    // Add a numeric data entry block to the diagram
    //
    this.addNumericBlock = function() {
        var offsetx = _this.newBlockXOffset();
        var offsety = _this.newBlockYOffset();
    
        var block = createFlowBlock(
                        {   name:           'number', 
                            type:           'number_entry', 
                            output_count:   1, 
                            output_type:    'n'    });

        _this.m_diagram.blocks.push(block);
        block.view.x = 35 + offsetx;
        block.view.y = 35 + offsety;
        _this.displayBlock(block);
    };
    
    //
    // Add a plot block
    //
    this.addPlotBlock = function() {
        var offsetx = _this.newBlockXOffset();
        var offsety = _this.newBlockYOffset();
        
        var block = createFlowBlock(
                        {   name:           'plot', 
                            type:           'plot', 
                            input_count:    1, 
                            input_type:     'n'     });

        _this.m_diagram.blocks.push(block);
        block.view.x = 35 + offsetx;
        block.view.y = 35 + offsety;
        _this.displayBlock(block);
        CodapTest.logTopic('Dataflow/AddPlot');
    };

    //
    // Triggered when a numeric entry field is edited
    //
    this.numberEntryChanged = function(e) {
        var block = _this.m_diagram.findBlockById(e.data);
        var val = parseFloat($('#bv_' + block.id).val());
        if (isNaN(val)) {
            block.updateValue(null);
        } else {
            block.updateValue(val);
        }
        // fix(faster): only trigger if value has changed
        
        //update any blocks that this action may affect
        _this.updateAllBlocks();
    }
    
    //
    // Triggered when a parameter entry field loses focus
    //    
    this.paramEntryFocusOut = function(e) {
        _this.updateParamFromEntryField(e, true);
    }
    
    //
    // Triggered when a parameter entry field is edited
    //    
    this.paramEntryChanged = function(e) {
        _this.updateParamFromEntryField(e, false);
    }
    
    this.updateParamFromEntryField = function(e, stripwhitespace) {
        var block = _this.m_diagram.findBlockById(e.data.blockid);
        var paramname = e.data.paramname;
        var connectedblockid = e.data.connectedblockid;
        var divindex = e.data.divindex;
        for (var i = 0; i < block.params.length; i++) {
            var param = block.params[i];
            if(paramname == param.name){
                var defval = param['default'];
                if(isNaN(defval)){ //handle strings first
                    if(paramname == "sequence_names"){
                        var val = $('#b' + block.id + '_bp_' + param.name + divindex).val();
                        val = Util.filterInvalidCharacters(val);
                        if(stripwhitespace)
                            val = Util.filterWhiteSpaceCharacters(val);
                        $('#b' + block.id + '_bp_' + param.name + divindex).val(val);
                        paramKeyArray = Object.keys(param.value);
                        paramValueArray = Object.values(param.value);
                        param.value[connectedblockid] = val;
                    }
                    else{
                        var val = $('#b' + block.id + '_bp_' + param.name).val();
                        val = Util.filterInvalidCharacters(val);
                        if(stripwhitespace)
                            val = Util.filterWhiteSpaceCharacters(val);
                        $('#b' + block.id + '_bp_' + param.name).val(val);
                        param.value = val;
                    }
                }
                else{
                    var str = $('#b' + block.id + '_bp_' + param.name).val();
                    str = str.replace ( /[^0-9.]/g, '' ); //strip out non-numeric values
                    $('#b' + block.id + '_bp_' + param.name).val(str); //put stripped back in the input field
                    var val = parseFloat(str); 
                    if (isNaN(val)) {
                        param.value = param['default'];
                         $('#b' + block.id + '_bp_' + param.name).val(param.value);
                    } else {
                        param.value = val;
                    }
                }
            }
        }
        // fix(faster): only trigger if value has changed
    
        //update any blocks that this action may affect
        _this.updateAllBlocks();
    }
    
    

    //
    // Store the last received sensor data
    //
    this.receivedSensorData = {};

    //
    // Return an array containing block names for any sensor blocks that cannot 
    // be mapped to the last received sensor data.
    //
    this.getUnmappedSensors = function() {
        var ret = [];
        for (var i = 0; i < _this.m_diagram.blocks.length; i++) {
            var block = _this.m_diagram.blocks[i];
            if(_this.isDeviceBlock(block.type)) {
                if(!_this.receivedSensorData[block.name]) {
                    ret.push(block.name);
                }
            }
        }
        return ret;
    }
    
    //
    // return the name of the recording location in program
    //
    this.getRecordingLocationFromDataBlock = function() {
        var ret = "";
        for (var i = 0; i < _this.m_diagram.blocks.length; i++) {
            var block = _this.m_diagram.blocks[i];
            if(block.type === "data storage") {
                for (var x = 0; x < block.params.length; x++) {
                    var param = block.params[x];                
                    var val = param.value        
                    if(param.name=="dataset_location"){
                        ret = val;
                        break;
                    }
                }
            }
        }
        return ret;
    }
    //
    // check if we have a data storage block
    //
    this.programHasDataStorageBlock = function() {
        var ret = false;
        for (var i = 0; i < _this.m_diagram.blocks.length; i++) {
            var block = _this.m_diagram.blocks[i];
            if(block.type === "data storage") {
                ret = true;
                break;
            }
        }
        return ret;
    }    
    //
    // return the name of the recording location in program
    //
    this.validSequenceNames = function() {
        var ret = true;
        for (var i = 0; i < _this.m_diagram.blocks.length; i++) {
            var block = _this.m_diagram.blocks[i];
            if(block.type === "data storage") {
                for (var x = 0; x < block.params.length; x++) {
                    var param = block.params[x];                
                    var val = param.value        
                    if(param.name=="sequence_names"){
                        var paramKeyArray = Object.keys(param.value);
                        var paramValueArray = Object.values(param.value);
                        for(var x = 0; x < (paramValueArray.length); x++){
                            if(paramValueArray == ""){
                                ret = false;
                                break;
                            }
                        }
                        break;
                    }
                }
            }
        }
        return ret;
    }    

    //
    // update blocks when pi is unselected
    //    
    this.piUnselected = function (){
        //
        // Clear any old sensor data being displayed.
        // Do this by calling the handler with an empty array of
        // data.
        //            
        _this.handleSensorData(null, { data: [] });
    }

    //
    // Handle sensor data messages
    //
    this.handleSensorData = function(timestamp, params) {
        // console.log("[DEBUG] handleSensorData", params);
        if(params.data) {
            // console.log("[DEBUG] handleSensorData updating blocks.");
            _this.receivedSensorData = {};
            for(var i = 0; i < params.data.length; i++) {
                var sensor  = params.data[i];
                var name    = sensor.name;
                var value   = sensor.value;
                var block   = _this.nameHash[name];
                if (block) {
                    block.updateValue(value);
                    _this.displayBlockValue(block);
                }
                _this.receivedSensorData[name] = sensor;
            }

            //
            // Check for device blocks for which we did not receive any data
            // and set their values to null.
            //
            if(_this.m_diagram == null){
                return;
            }
            for (var i = 0; i < _this.m_diagram.blocks.length; i++) {
                var block = _this.m_diagram.blocks[i];
                if(_this.isDeviceBlock(block.type)) {
                    if(!_this.receivedSensorData[block.name]) {
                        block.updateValue(null);
                        _this.displayBlockValue(block);
                    }
                }
            }

            //
            // Now compute values for non-sensor blocks
            //
            //console.log("[DEBUG] diagram.update()");
            _this.m_diagram.update();

            //
            // Update UI
            //
            for (var i = 0; i < _this.m_diagram.blocks.length; i++) {
                _this.displayBlockValue(_this.m_diagram.blocks[i]);
            }            
        }
    }
    
    this.updateAllBlocks = function() {

        //
        // Now compute values for non-sensor blocks
        //
        //console.log("[DEBUG] diagram.update()");
        _this.m_diagram.update();
        
        //update pins
        _this.updateDataStoragePins();
        
        //
        // Update UI
        //
        for (var i = 0; i < _this.m_diagram.blocks.length; i++) {
            _this.displayBlockValue(_this.m_diagram.blocks[i]);
        }        

    }
    
    //
    // Update pins on data storage block
    //
    this.updateDataStoragePins = function () {
        for (var i = 0; i < _this.m_diagram.blocks.length; i++) {
            if(_this.m_diagram.blocks[i].type === "data storage"){
                var numConnectedPins = 0;
                var deletionIndex = 0;
                var deletionBlockId = 0;
                //how many pins are connected to this block?
                var numPins = _this.m_diagram.blocks[i].inputCount;
                for(var x = 0; x < _this.m_diagram.blocks[i].pins.length; x++){
                    if(_this.m_diagram.blocks[i].pins[x].sourcePin!=null){
                        numConnectedPins++;
                    }
                }
                if(numPins == (numConnectedPins + 1)){
                    return;
                }
                else{
                    //we have an incorrect number of pins, need to add or subtract something
                    
                    var addingPin = true;
                    if(numPins > (numConnectedPins + 1))
                        addingPin = false;
                    var connectedId;
                    
                    var newPinCount = numConnectedPins + 1; 
                    _this.m_diagram.blocks[i].inputCount = numConnectedPins + 1; 

                    if(addingPin){
                        var pin = createPin(_this.m_diagram.blocks[i], 1, true);
                        _this.m_diagram.blocks[i].pins.push(pin);

                        var x = _this.m_diagram.blocks[i].view.x;
                        var y = _this.m_diagram.blocks[i].view.y;
                        var pinRadius = 10 * this.m_scale;
                        if (pinRadius > 15) {
                            pinRadius = 15;
                        } else if (pinRadius < 5) {
                            pinRadius = 5;
                        }
                        //
                        // Position and draw pins
                        //
                        var p = _this.m_diagram.blocks[i].pins.length - 1;
                    
                        var pin = _this.m_diagram.blocks[i].pins[p];
                        pin.view.offsetX = -4;
                        pin.view.offsetY = 124 + (36*p);
                        pin.view.x = x + pin.view.offsetX;
                        pin.view.y = y + pin.view.offsetY;
                        var pinSvg = this.m_svgDrawer.circle(pinRadius * 2).center(pin.view.x, pin.view.y).attr({fill: '#808080'});
                        pinSvg.remember('pin', pin);
                        pinSvg.mousedown(this.pinMouseDown);
                        pinSvg.mouseup(this.pinMouseUp);
                        pinSvg.mouseover(this.pinMouseOver);
                        pinSvg.mouseout(this.pinMouseOut);
                        pin.view.svg = pinSvg;
                    }
                    else{
                        //determine the pin that needs to be removed
                        for(var x = 0; x < _this.m_diagram.blocks[i].pins.length; x++){
                            if(_this.m_diagram.blocks[i].pins[x].sourcePin==null){
                                _this.m_diagram.blocks[i].pins[x].view.svg.remove();
                                _this.m_diagram.blocks[i].pins.splice(x, 1);
                               // deletionIndex = x;
                                break;
                            }
                        }
                        //reposition the remaining pins
                        var y = _this.m_diagram.blocks[i].view.y;
                        for(var x = 0; x < _this.m_diagram.blocks[i].pins.length; x++){
                            _this.m_diagram.blocks[i].pins[x].view.offsetY = 124 + (x*36);
                            _this.m_diagram.blocks[i].pins[x].view.y = y + _this.m_diagram.blocks[i].pins[x].view.offsetY;
                        }
                    }                    
                    
                    //update the block params 
                    var paramSequenceObject;                    
                    var paramKeyArray;    
                    var paramValueArray; 
                    var newlyConnectedBlockId;
                    var newlyConnectedBlockName;
                    for (var pa = 0; pa < _this.m_diagram.blocks[i].params.length; pa++) {
                        paramSequenceObject = _this.m_diagram.blocks[i].params[pa];                
                        if(paramSequenceObject.name=="sequence_names"){
                            
                            //found the sequence names params
                            if(addingPin){
                                //the newly connected pin
                                newlyConnectedBlockId = _this.m_diagram.blocks[i].pins[numConnectedPins-1].sourcePin.block.id;
                                //get sequence name from block name
                                newlyConnectedBlockName = _this.m_diagram.blocks[i].pins[numConnectedPins-1].sourcePin.block.name;
                                var potentialSequenceName = newlyConnectedBlockName;
                                var count = 0;
                                unique = true;
                                paramValueArray = Object.values(_this.m_diagram.blocks[i].params[pa].value);
                                do { 
                                    unique = true;
                                    for(var pv = 0; pv < paramValueArray.length; pv++){
                                        if(potentialSequenceName == paramValueArray[pv]){
                                            count++;
                                            potentialSequenceName = newlyConnectedBlockName + count;
                                            unique = false;
                                            break;
                                        }                                        
                                    }
                                } while(unique==false);
                                //get the sequence name from the div
                                //var bid = 'b' + _this.m_diagram.blocks[i].id + '_bp_' + "sequence_names" + (newPinCount-1);
                                //wtd wtd wtd check for uniqueness of name
                                //$('#' + bid).val();
                                _this.m_diagram.blocks[i].params[pa].value[newlyConnectedBlockId] = potentialSequenceName;
                            }
                            else{
                                paramKeyArray = Object.keys(paramSequenceObject.value);
                                var deletionId;
                                //determine the param that needs to be removed    
                                for(var pk = 0; pk < paramKeyArray.length; pk++){
                                    var foundit = false;
                                    for(var pi = 0; pi < _this.m_diagram.blocks[i].pins.length; pi++){
                                        if(_this.m_diagram.blocks[i].pins[pi].sourcePin!=null){
                                            if(_this.m_diagram.blocks[i].pins[pi].sourcePin.block.id == paramKeyArray[pk]){
                                                foundit = true;
                                                break;
                                            }
                                        }
                                    }    
                                    if(!foundit){
                                        deletionId = paramKeyArray[pk];
                                        break;        
                                    }
                                }
                                delete _this.m_diagram.blocks[i].params[pa].value[deletionId];
                            }
                            //generate arrays of the keys and values, we need these to create the HTML divs
                            paramKeyArray = Object.keys(_this.m_diagram.blocks[i].params[pa].value);
                            paramValueArray = Object.values(_this.m_diagram.blocks[i].params[pa].value);
                        }
                    }
                    
                    
                    //adjust the size based on the number of connected pins
                    var newDivHeight = 142 + (newPinCount-1) * 36; 
                    $("#b_" + _this.m_diagram.blocks[i].id ).css('height', newDivHeight + 'px');
                    $("#bcon_" + _this.m_diagram.blocks[i].id ).css('height', newDivHeight + 'px');
                    _this.m_diagram.blocks[i].view.h = newDivHeight;
                    
                    //remove all existing ephemeral divs 
                    $('.ephemeralDiv').remove()
                    //create divs
                    for(var x = 0; x < (newPinCount); x++){
                        //make a new div to show sequence info
                        var divflowBlockInputHolder = $('<div>', {class: 'flowBlockInputHolder flowBlockInputHolderMargin ephemeralDiv'});
                        $("#bcon_" + _this.m_diagram.blocks[i].id ).append(divflowBlockInputHolder);
                        var displayedParamName = "type";
                        var initval = "";//"data type" + (x+1);
                        
                        //get the block id from each connected pin, use that block id to get sequence name to put here
                        var connectedBlockId = -1;
                        //find the id on the xth pin
                        if(_this.m_diagram.blocks[i].pins[x].sourcePin!=null){
                            connectedBlockId = _this.m_diagram.blocks[i].pins[x].sourcePin.block.id;
                            var pindex = 0;
                            for(var pk = 0; pk < paramKeyArray.length; pk++){
                                if(connectedBlockId == paramKeyArray[pk]){
                                    pindex = pk;
                                    break;
                                }
                            }
                            initval = paramValueArray[pindex];
                        }
                        
                        $('<div>', {class: 'flowBlockParamLabel noSelect', html: displayedParamName}).appendTo(divflowBlockInputHolder);    
                        var divindex = x+1;                                        
                        var input = $('<input>', {class: 'form-control flowBlockInput flowBlockInputLong', type: 'text', id: 'b' + _this.m_diagram.blocks[i].id + '_bp_' + "sequence_names" + divindex, value: initval}).prependTo(divflowBlockInputHolder);
                        
                        input.mousedown(function(e) {e.stopPropagation()});
                        var eventdata = {blockid:_this.m_diagram.blocks[i].id, paramname: "sequence_names", connectedblockid:connectedBlockId, divindex:divindex };
                        input.keyup(eventdata, _this.paramEntryChanged);
                        input.focusout(eventdata, _this.paramEntryFocusOut);
                    }
                    
                    
                    //force refresh of block so we display pins and connections correctly
                    _this.moveBlock(_this.m_diagram.blocks[i], 
                            _this.m_diagram.blocks[i].view.x, 
                            _this.m_diagram.blocks[i].view.y );
                            
                }
            }
        }        
        
        
    }
    
    //
    // Display the current value of a block in the UI
    //
    this.displayBlockValue = function(block) {
        if (block.type === 'number_entry') {
            // do nothing
        } else if (block.type === 'plot') {
            if (block.value !== null && !isNaN(block.value)) {
                var timestamp = moment().valueOf() * 0.001 - g_startTimestamp;
                block.view.xData.data.push(timestamp);
                block.view.yData.data.push(block.value);
                if (block.view.xData.data.length > 30) {
                    block.view.xData.data.shift();
                    block.view.yData.data.shift();
                }
            } else {
                block.view.xData.data = [];
                block.view.yData.data = [];
            }
            block.view.plotHandler.plotter.autoBounds();
            block.view.plotHandler.drawPlot(null, null);
        } else if (block.outputType === 'i') {  // image-valued blocks
            if (block.value === null) {
                // fix(soon): display something to let user know camera is offline
            } else {
                console.log('set image ' + block.value.length);
                $('#bi_' + block.id).attr('src', 'data:image/jpeg;base64,' + block.value);
            }
        } else if (block.type === "data storage"){
            $('#bv_' + block.id).html('');
        } else if (block.type === "relay"){
            var mag = Math.abs(block.value);
            if(mag >= 1)
                $('#bv_' + block.id).html('on');
            else
                $('#bv_' + block.id).html('off');
        }            
        else {
            if (block.value === null) {
                $('#bv_' + block.id).html('...');
            } else {
                if(block.value > 10000){
                    var roundednum = Math.round(block.value * 1) / 1;
                }
                else if(block.value > 1000){
                    var roundednum = Math.round(block.value * 10) / 10;
                }
                else if(block.value > 100){
                    var roundednum = Math.round(block.value * 100) / 100;
                }
                else{
                    var roundednum = Math.round(block.value * 1000) / 1000;
                }
                $('#bv_' + block.id).html(roundednum);  // fix(faster): check whether value has changed
            }
        }
    }

    /**
     * zoom blocks
     * Params:
     *   blocks
     *   factor: factor to zoom by, such as 0.7 or 1.3
     */
    this.zoomBlocks = function(increment) {
        this.m_scale += increment;
        // var blocks = this.m_diagram.blocks;
        // for (var i = 0; i < blocks.length; i++) {
        //    blocks[i].view.x = Math.round(blocks[i].view.x * this.m_scale);
        //    blocks[i].view.y = Math.round(blocks[i].view.y * this.m_scale);
        // }
        this.redrawBlocks();
    }

    //
    // Redraw blocks. Usually called as part of scaling.
    //
    this.redrawBlocks = function() {
        if (this.m_diagram) {  // remove any existing diagram elements
            for (var i = 0; i < this.m_diagram.blocks.length; i++) {
                this.undisplayBlock(this.m_diagram.blocks[i]);
            }
            for (var i = 0; i < this.m_diagram.blocks.length; i++) {
                this.displayBlock(this.m_diagram.blocks[i]);
            }
        }
        // redraw connections
        for (var i = 0; i < this.m_diagram.blocks.length; i++) {
            var block = this.m_diagram.blocks[i];
            for (var j = 0; j < block.pins.length; j++) {
                var pin = block.pins[j];
                if (pin.sourcePin) {
                    this.displayConnection(pin, g_scale);
                }
            }
        }
    }
    
    //
    // Notify program editor we are in record mode
    //
    this.toggleRunProgramMode = function(running) {
        if(running){
            this.m_runningProgram = true;
            $("#program-holder-overlay").css("display", "block");
        }
        else{
            this.m_runningProgram = false;
            $("#program-holder-overlay").css("display", "none");
        }
        
    }

    return this;
}

