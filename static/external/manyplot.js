function createPlotHandler( canvas, multiFrame ) {

	var plotHandler = {};
	plotHandler.plotter = createPlotter( canvas, multiFrame );
	plotHandler.mouseDown = false;
	plotHandler.xDownLast = null;
	
	plotHandler.drawPlot = function( xMouse, yMouse ) {
		var args = {
			"useTimestamp": true,
			"presentIsZero": false,
		};
		this.plotter.drawPlot( xMouse, yMouse, args );
	}

	// handle mouse events (pan the plot or display mouse-over info)
	plotHandler.onMouse = function( e ) {
		var x = objectClickX( e );
		var y = objectClickY( e );
		e.preventDefault();
		e.stopPropagation();
		if (e.type === "mousedown") {
			plotHandler.mouseDown = true;
		} else if (e.type === "mouseup") {
			plotHandler.mouseDown = false;
		} else if (e.type === "mouseout" || e.type === "mouseleave") {
			plotHandler.mouseDown = false;
		}
		if (plotHandler.mouseDown) {
			if (plotHandler.xDownLast) {
				plotHandler.plotter.pan( plotHandler.xDownLast, x );
			}
			plotHandler.drawPlot( x, y );
			plotHandler.xDownLast = x;
		} else {
			plotHandler.drawPlot( x, y );
			plotHandler.xDownLast = null; 
		}
	};
	
	canvas.addEventListener( "mousemove", plotHandler.onMouse, false );
	canvas.addEventListener( "mouseup", plotHandler.onMouse, false );
	canvas.addEventListener( "mousedown", plotHandler.onMouse, false );
	canvas.addEventListener( "mouseout", plotHandler.onMouse, false );
	canvas.addEventListener( "mouseleave", plotHandler.onMouse, false );

	plotHandler.zoomIn = function() {
		plotHandler.plotter.zoomIn();
		plotHandler.drawPlot( null, null );
	};

	plotHandler.zoomOut = function() {
		plotHandler.plotter.zoomOut();
		plotHandler.drawPlot( null, null );
	};

	return plotHandler;
}


// returns a plotter object suitable for displaying numeric plots on an HTML5 canvas context
function createPlotter( canvas, multiFrame ) {
	// If multiFrame is false, then we'll draw all frames in one plot.
	// If true, then each frame will have it's own box, captions, etc.
	if(typeof multiFrame === 'undefined') multiFrame = true;
	var plotter = {};
	// Get the canvas and ctx. If this is the plotter of a child plotBlock,
	// it won't have a canvas element.
	plotter.canvas = canvas;
	if(plotter.canvas){
		plotter.ctx = plotter.canvas.getContext( "2d" );
		setInitTransform( plotter.ctx );
		addDrawMethods( plotter.ctx );
	}

	plotter.dataPairs = []; // A list of objects {"xData":DataColumn, "yData":DataColumn, "color":"rgb(#,#,#)"}
	plotter.frames = [];
	plotter.zoomLevel = 1;
	plotter.plotMode = 'line';

	// Takes a string and sets the plotter.plotMode.
	plotter.setPlotMode = function(plotMode){
		switch(plotMode){
			case "line":
				this.plotMode = plotMode;
				break;
			case "histogram":
				this.plotMode = plotMode;
				break;
			case "scatter":
				this.plotMode = plotMode;
				break;
			default:
				this.plotMode = "line";
		}
	};

	// set data to use for plotting; updates plot bounds from data
	plotter.setData = function( dataPairs ) {
		this.dataPairs = dataPairs;
		// Frame count
		var frameCount = multiFrame ? this.dataPairs.length : 1;
		if(frameCount < 1){
			frameCount = 1;
		}
		this.setFrameCount( frameCount );

		if(this.plotMode === "line"){
			this.resetZoom(); //This will call autobounds as well
		}
		if(this.plotMode === "scatter"){
			this.autoBounds();
		}
	};

	// fix(soon): refactor
	plotter.setFrameCount = function( frameCount ) {
		while (this.frames.length < frameCount) {
			this.frames.push( createFrame( this.canvas.getContext( "2d" ) ) );
		}
		if (this.frames.length > frameCount) {
			this.frames = this.frames.slice( 0, frameCount );
		}
	};

	plotter.elapsedTimeBounds = function(presentIsZero){
		if(presentIsZero === undefined) presentIsZero = false;
		var captionOverrides = {}; // This is the object we'll return

		// We're only setting the bounds once. This will override for all data pairs.
		// So let's only do this if the first dataPair.xData is a timestamp
		if(this.dataPairs.length && this.frames.length && this.dataPairs[0].xData.type === "timestamp"){
			var timestampCol = this.dataPairs[0].xData;
			var timestampMax = timestampCol.max;
			var timestampMin = timestampCol.min;
			if(presentIsZero){
				// Then the max timestamp should be regarded as "0".
				captionOverrides["xMinLabelOverride"] = (new Date(this.frames[0].dataMinX * 1000) - new Date(timestampMax * 1000)) / 1000;
				captionOverrides["xMaxLabelOverride"] = (new Date(this.frames[0].dataMaxX * 1000) - new Date(timestampMax * 1000)) / 1000;
			}else{
				// Then the min timestamp should be regarded as "0"
				captionOverrides["xMinLabelOverride"] = (new Date(this.frames[0].dataMinX * 1000) - new Date(timestampMin * 1000)) / 1000;
				captionOverrides["xMaxLabelOverride"] = (new Date(this.frames[0].dataMaxX * 1000) - new Date(timestampMin * 1000)) / 1000;
			}
			// If we don't fix the decimals, then the elapsed time can visually bounce around when it hits whole numbers
			captionOverrides["xMinLabelOverride"] = toFixedSafe(captionOverrides["xMinLabelOverride"], 2);
			captionOverrides["xMaxLabelOverride"] = toFixedSafe(captionOverrides["xMaxLabelOverride"], 2);
			captionOverrides["xLabelOverride"] = "seconds";
		}
		return captionOverrides;
	};

	// ================ display bounds ================

	// Set the bounds of the frames based on the current bounds of the data pairs
	plotter.setBoundsFromData = function(){
		// This only really makes sense when there is one dataPair per frame
		// Otherwise, how do we choose which bounds to apply to the frame?
		if(this.frames.length === this.dataPairs.length){
			for(i = 0; i < this.frames.length; ++i){
				// We just get the values directly. If we called computeBounds, this
				// would overwrite the bounds that have been set.
				xD = this.dataPairs[i].xData;
				yD = this.dataPairs[i].yData;
				var xMin = xD.minBound === null ? xD.min : xD.minBound;
				var xMax = xD.maxBound === null ? xD.max : xD.maxBound;
				var yMin = yD.minBound === null ? yD.min : yD.minBound;
				var yMax = yD.maxBound === null ? yD.max : yD.maxBound;
				this.frames[ i ].dataMinX = xMin;
				this.frames[ i ].dataMaxX = xMax;
				this.frames[ i ].dataMinY = yMin;
				this.frames[ i ].dataMaxY = yMax;
			}
		}
	};

	// Recalculate the bounds based on the current data
	plotter.autoBounds = function(){
		// If the plotter is zoomed, then presumably the user is inspecting
		// some part of the plot and wouldn't want the view to snap back.
		if(this.zoomLevel !== 1) return;

		var i, xD, yD, xMin, xMax, yMin, yMax, frame;
		if(multiFrame){
			for(i = 0; i < this.frames.length; ++i){
				frame = this.frames[ i ];
				xD = this.dataPairs[i].xData;
				yD = this.dataPairs[i].yData;
				xD.computeBounds();
				yD.computeBounds();
				xMin = xD.minBound === null ? xD.min : xD.minBound;
				xMax = xD.maxBound === null ? xD.max : xD.maxBound;
				yMin = yD.minBound === null ? yD.min : yD.minBound;
				yMax = yD.maxBound === null ? yD.max : yD.maxBound;
				frame.dataMinX = xMin;
				frame.dataMaxX = xMax;
				frame.dataMinY = yMin;
				frame.dataMaxY = yMax;
			}
		}else{
			if(this.frames.length < 1) return;
			// Set the min and max from the first data pair
			xD = this.dataPairs[0].xData;
			yD = this.dataPairs[0].yData;
			xD.computeBounds();
			yD.computeBounds();
			xMin = xD.min;
			xMax = xD.max;
			yMin = yD.min;
			yMax = yD.max;
			var boundsSet = false;
			if(xD.minBound !== null){
				boundsSet = true;
				xMin = xD.minBound;
			}
			if(xD.maxBound !== null){
				boundsSet = true;
				xMax = xD.maxBound;
			}
			if(yD.minBound !== null){
				boundsSet = true;
				yMin = yD.minBound;
			}
			if(yD.maxBound !== null){
				boundsSet = true;
				yMax = yD.maxBound;
			}
			// If the bounds haven't been set, then see if any others are better
			if(!boundsSet){
				for(i = 1; i < this.dataPairs.length; ++i){
					xD = this.dataPairs[i].xData;
					yD = this.dataPairs[i].yData;
					xD.computeBounds();
					yD.computeBounds();
					if(xD.min < xMin) xMin = xD.min;
					if(xD.max > xMax) xMax = xD.max;
					if(yD.min < yMin) yMin = yD.min;
					if(yD.max > yMax) yMax = yD.max;
				}
			}
			frame = this.frames[ 0 ];
			frame.dataMinX = xMin;
			frame.dataMaxX = xMax;
			frame.dataMinY = yMin;
			frame.dataMaxY = yMax;
		}
	};

	// Adds the given values to the bounds. Pass null to leave a bound unchanged
	plotter.addToBounds = function(xMin, xMax, yMin, yMax){
		var xMinDiff = xMin || 0;
		var xMaxDiff = xMax || 0;
		var yMinDiff = yMin || 0;
		var yMaxDiff = yMax || 0;
		// Make sure one is non-zero before continuing
		if(xMinDiff || xMaxDiff || yMinDiff || yMaxDiff ){
			for(var i = 0; i < this.frames.length; ++i){
				this.frames[ i ].dataMinX += xMinDiff;
				this.frames[ i ].dataMaxX += xMaxDiff;
				this.frames[ i ].dataMinY += yMinDiff;
				this.frames[ i ].dataMaxY += yMaxDiff;
			}
		}
	};

	// ================ drawing ================

	// This method draws the type of plot set with plotter.setPlotMode() to the
	// canvas the was provided when the plotter was created. If xMouse and yMouse
	// values are provided, data near that point will be highlighted based on the
	// plot mode.
	plotter.drawPlot = function(xMouse, yMouse, args){
		if(this.frames.length < 1) return;

		if(typeof xMouse === 'undefined' || isNaN(xMouse)) xMouse = null;
		if(typeof yMouse === 'undefined' || isNaN(yMouse)) yMouse = null;

		switch(this.plotMode){
			case 'line':
				this.drawLinePlot(
					xMouse,
					yMouse,
					args["useTimestamp"],
					args["presentIsZero"]
				);
				break;
			case 'histogram':
				var histogramBuckets = 0;
				if(args["histogramBuckets"] !== undefined && !isNaN(args["histogramBuckets"])){
					histogramBuckets = args["histogramBuckets"];
				}
				this.drawHistogramPlot(xMouse, yMouse, histogramBuckets);
				break;
			case 'scatter':
				this.drawScatterPlot(xMouse, yMouse);
				break;
		}
	};

	// All parameters optional.
	plotter.drawLinePlot = function(xMouse, yMouse, useTimestamp, presentIsZero){
		// If useTimestamp is either undefined or false
		if(useTimestamp === undefined || !useTimestamp){
			var captionOverrides = this.elapsedTimeBounds(presentIsZero);
			this.drawCaptions(
				captionOverrides["xLabelOverride"],
				captionOverrides["xMinLabelOverride"],
				captionOverrides["xMaxLabelOverride"]
			);
		}else{
			this.drawCaptions();
		}
		this.drawBackground();
		this.drawBox();
		if (this.dataPairs.length) {
			this.drawData( true );
		}
		if(xMouse !== null && yMouse !== null){
			this.highlightValue( xMouse, yMouse, useTimestamp, presentIsZero );
		}
	};

	plotter.drawHistogramPlot = function(xMouse, yMouse, histogramBuckets){
		var histogram = null;
		if(this.dataPairs.length){
			var xData = this.dataPairs[0].xData;
			//xData.computeBounds();

			// compute histogram
			histogram = computeHistogram( xData.data, histogramBuckets, xData.min, xData.max );
			// count labels
			var yMin = 0;
			var yMax = Math.max.apply( null, histogram.counts );
			var yLabel = "count";

			this.drawRawCaptions( xData.name, xData.format(xData.min), xData.format(xData.max), yLabel, yMin, yMax );
			this.drawBackground();
			// draw the plot
			this.drawBox();
			this.drawHistogram(histogram.counts, false);
		}else{
			this.drawBackground();
			this.drawBox();
		}

		if(xMouse !== null && yMouse !== null && histogram){
			this.highlightHistogram( histogram.counts, xMouse, yMouse );
		}
	};

	plotter.drawScatterPlot = function(xMouse, yMouse){
		this.drawCaptions();
		this.drawBackground();
		this.drawBox();
		if(this.dataPairs.length){
			this.drawDataDots(false);
		}

		if(xMouse !== null && yMouse !== null){
			this.highlightDot( xMouse, yMouse );
		}
	};

	// fix(soon): remove/rework
	// draw x-axis and y-axis labels on the plot
	plotter.drawRawCaptions = function( xLabel, xMinLabel, xMaxLabel,
										yLabel, yMinLabel, yMaxLabel, rotateLabelY ) {
		var ctx = this.ctx;
		var width = this.canvas.width;
		var height = this.canvas.height;
		ctx.setTransform( 1, 0, 0, 1, 0, 0 );

		// clear the background
		ctx.clearRect( 0, 0, width, height );

		// fit frame to caption text and draw caption text
		this.setFrameCount( 1 );
		this.frames[ 0 ].setCaptions( xLabel, xMinLabel, xMaxLabel, yLabel, yMinLabel, yMaxLabel, rotateLabelY );
		this.frames[ 0 ].fitBoxToCaptions( 0, width - 1, 0, height - 1 );
		this.frames[ 0 ].drawCaptions();
	};

	// fix(soon): remove
	plotter.drawBox = function() {
		for (var i = 0; i < this.frames.length; i++)
			this.frames[ i ].drawBox();
	};

	// fix(soon): make faster and move into frame
	// draw a white background for the data box
	plotter.drawBackground = function() {
		var ctx = this.ctx;
		for(var i = 0; i < this.frames.length; ++i){
			ctx.save();
			this.frames[ i ].clipBox();
			ctx.setTransform( 1, 0, 0, 1, 0, 0 );
			ctx.fillStyle = "rgb(255,255,255)";
			ctx.fillRect( 0, 0, this.canvas.width, this.canvas.height );
			ctx.restore();
		}
	};

	// fix(soon): rework or remove
	// draw x-axis and y-axis labels on the plot, using data set via setData
	plotter.drawCaptions = function( xLabelOverride, xMinLabelOverride, xMaxLabelOverride ) {
		var ctx = this.ctx;
		var width = this.canvas.width;
		var height = this.canvas.height;
		ctx.setTransform( 1, 0, 0, 1, 0, 0 );
		ctx.clearRect( 0, 0, width, height ); // clear the background
		var outerFrameHeight = height / this.frames.length;
		for (var i = 0; i < this.frames.length; i++) {

			// compute labels based on data columns
			var units = "";
			var xData = this.dataPairs[i].xData;
			var yData = this.dataPairs[i].yData;
			units = xData.units;
			var xLabel = units === "" ? xData.name : units;
			var xMinLabel = xData.format( this.frames[ i ].dataMinX );
			var xMaxLabel = xData.format( this.frames[ i ].dataMaxX );
			units = yData.units;
			var yLabel = units === "" ? yData.name : units;
			var yMinLabel = yData.format( this.frames[ i ].dataMinY );
			var yMaxLabel = yData.format( this.frames[ i ].dataMaxY );

			if (xLabelOverride !== undefined)
				xLabel = xLabelOverride;
			if (xMinLabelOverride !== undefined)
				xMinLabel = xMinLabelOverride;
			if (xMaxLabelOverride !== undefined)
				xMaxLabel = xMaxLabelOverride;

			// compute outer frame bounds
			var outerMinX = 0;
			var outerMaxX = width - 1;
			var outerMinY = Math.round( outerFrameHeight * i );
			var outerMaxY = Math.round( outerFrameHeight * (i + 1) - 1 );

			// fit frame to caption text
			this.frames[ i ].setCaptions( xLabel, xMinLabel, xMaxLabel, yLabel, yMinLabel, yMaxLabel, yData.rotateLabel );
			this.frames[ i ].fitBoxToCaptions( outerMinX, outerMaxX, outerMinY, outerMaxY );
		}

		// if multiple frames, left align their boxes
		if (this.frames.length > 1) {
			var leftSpace = 0;
			for (var i = 0; i < this.frames.length; i++) {
				var boxMinX = this.frames[ i ].boxMinX;
				if (boxMinX > leftSpace)
					leftSpace = boxMinX;
			}
			for (var i = 0; i < this.frames.length; i++) {
				this.frames[ i ].boxMinX = leftSpace;
			}
		}

		// draw caption text
		for (var i = 0; i < this.frames.length; i++) {
			this.frames[ i ].drawCaptions( xLabel, xMinLabel, xMaxLabel, yLabel, yMinLabel, yMaxLabel );
		}
	};

	// draw the data as one or more line plots
	plotter.drawData = function( clip ) {
		if(this.frames.length < 1) return;
		var ctx = this.ctx;
		if (this.dataPairs.length == this.frames.length) { // if one frame per data pair
				for (var i = 0; i < this.frames.length; i++) {
						ctx.save(); // save before clip
						if (clip)
								this.frames[ i ].clipBox();
						var color = "rgb(0,125,175)";
						if(typeof this.dataPairs[i].color !== 'undefined'){
							color = this.dataPairs[i].color;
						}
						ctx.strokeStyle = color;
						this.frames[ i ].drawData( this.dataPairs[ i ].xData, this.dataPairs[i].yData );
						ctx.restore(); // restore after clip
				}
		} else { // otherwise, assume one frame with multiple datas
				ctx.save(); // save before clip
				if (clip)
						this.frames[ 0 ].clipBox();
				for (var i = 0; i < this.dataPairs.length; i++) {
						ctx.strokeStyle = this.dataPairs[i].color;
						this.frames[ 0 ].drawData( this.dataPairs[ i ].xData, this.dataPairs[i].yData );
				}
				ctx.restore(); // restore after clip
		}
	};

	// draw data (x coordinates and corresponding y coordinates) as dots
	plotter.drawDataDots = function(clip) {
		if(this.frames.length < 1) return;
		var ctx = this.ctx;
		var color = "rgba(0,157,223,0.5)";
		if(typeof this.dataPairs[0].color !== 'undefined'){
			color = this.dataPairs[0].color;
		}
		ctx.save(); // save before clip
		if (clip)
				this.frames[ 0 ].clipBox();
		ctx.fillStyle = color;
		this.frames[ 0 ].drawDataDots( this.dataPairs[0].xData, this.dataPairs[0].yData );
		ctx.restore(); // restore after clip
	};

	plotter.drawHistogram = function(counts, clip){
		if(this.frames.length < 1) return;
		var ctx = this.ctx;
		ctx.save(); // save before clip
		if (clip)
				this.frames[ 0 ].clipBox();
		this.frames[ 0 ].drawHistogram( counts );
		ctx.restore(); // restore after clip
	};

	// fix(soon): remove
	// draw a line between two points in data coords
	plotter.drawLine = function( x1, y1, x2, y2 ) {
		if(this.frames.length < 1) return;
		var ctx = this.ctx;
		x1 = this.frames[ 0 ].dataToScreenX( x1 );
		y1 = this.frames[ 0 ].dataToScreenY( y1 );
		x2 = this.frames[ 0 ].dataToScreenX( x2 );
		y2 = this.frames[ 0 ].dataToScreenY( y2 );
		ctx.drawLine( x1, y1, x2, y2 );
	};

	// highlight the x value at a given y coordinate for all data pairs
	plotter.highlightValue = function( xScreen, yScreen, useTimestamp, presentIsZero ) {
		if(this.frames.length < 1) return;
		if(typeof useTimestamp === 'undefined') useTimestamp = false;

		var xMouseData = this.frames[ 0 ].screenToDataX( xScreen );
		if (xScreen > this.frames[ 0 ].boxMinX && xScreen < this.frames[ 0 ].boxMaxX) {
			if(this.frames.length === this.dataPairs.length){ // If one frame per data pair
				for (var i = 0; i < this.frames.length; i++) {
					this.frames[ i ].highlightValue( this.dataPairs[i].xData, this.dataPairs[i].yData, xMouseData, useTimestamp, presentIsZero );
				}
			}else{ // If one frame with multiple data pairs
				for (var i = 0; i < this.dataPairs.length; ++i) {
					var drawLine = i === 0 ? true : false;
					this.frames[ 0 ].highlightValue( this.dataPairs[i].xData, this.dataPairs[i].yData, xMouseData, useTimestamp, presentIsZero, drawLine );
				}
			}
		}
	};

	plotter.highlightHistogram = function(counts, xScreen, yScreen){
		if(this.frames.length < 1) return;
		this.frames[0].highlightHistogram(counts, xScreen, yScreen);
	};

	// highlight a dot in a scatter plot
	plotter.highlightDot = function( xScreen, yScreen ) {
		if(this.frames.length < 1) return;
		this.frames[ 0 ].highlightDot( this.dataPairs[0].xData, this.dataPairs[0].yData, xScreen, yScreen );
	};

	// ================ model bounds ================

	// model bounds in screen coords
	plotter.modelBoundsLeft = null;
	plotter.modelBoundsRight = null;

	plotter.clearModelBounds = function(){
		plotter.modelBoundsLeft = null;
		plotter.modelBoundsRight = null;
	};

	plotter.setModelBounds = function(xScreen1, xScreen2){
		if(xScreen1){
			plotter.modelBoundsLeft = plotter.frames[ 0 ].screenToDataX(xScreen1);
		}
		if(xScreen2){
			plotter.modelBoundsRight = plotter.frames[ 0 ].screenToDataX(xScreen2);
		}

		if(plotter.modelBoundsLeft && plotter.modelBoundsRight){
			// If right is > left, swap.
			if(plotter.modelBoundsLeft > plotter.modelBoundsRight){
				var temp = plotter.modelBoundsLeft;
				plotter.modelBoundsLeft = plotter.modelBoundsRight;
				plotter.modelBoundsRight = temp;
			}
		}
	};

	plotter.getModelBoundsIndices = function(){
		var bounds = {};
		bounds.left = 0;
		bounds.right = 0;

		function getNearestIndex(xScreen){
			var xPosData = plotter.frames[ 0 ].screenToDataX( xScreen );
			var nearestIndex = -1;
			var nearestDist = 0;
			var xDataRaw = plotter.dataPairs[ 0 ].xData.data;
			for (var i = 0; i < xDataRaw.length; i++) {
				var x = xDataRaw[ i ];
				var xDiff = x - xPosData;
				if (xDiff < 0) xDiff = -xDiff;
				if (xDiff < nearestDist || nearestIndex == -1) {
					nearestDist = xDiff;
					nearestIndex = i;
				}
			}
			return nearestIndex;
		}
		if (plotter.modelBoundsLeft && plotter.modelBoundsRight) {
			bounds.left = getNearestIndex(plotter.frames[ 0 ].dataToScreenX(plotter.modelBoundsLeft));
			bounds.right = getNearestIndex(plotter.frames[ 0 ].dataToScreenX(plotter.modelBoundsRight));
		}
		//console.log(bounds);
		return bounds;
	};

	plotter.drawModelBounds = function(){
		if(this.dataPairs.length < 1) return;

		var x;
		var xData = this.dataPairs[0].xData;
		var yData = this.dataPairs[0].yData;
		if (this.modelBoundsLeft) {
			x = this.frames[ 0 ].dataToScreenX( this.modelBoundsLeft );
			this.frames[0].drawBound( xData, yData, x, true );
        }
        if (this.modelBoundsRight) {
            x = this.frames[ 0 ].dataToScreenX( this.modelBoundsRight );
			this.frames[0].drawBound( xData, yData, x, false );
        }
	};

	// ================ pan / zoom ================
	// These functions have no effect if the plotMode is not "line"

	// Takes two x values in screen coordinates
	plotter.pan = function(lastX, currentX){
		if(this.plotMode !== "line" || this.frames.length < 1) return;
		var lastXData = this.frames[ 0 ].screenToDataX( lastX );
		var currentXData = this.frames[ 0 ].screenToDataX( currentX );
		var xDiff = currentXData - lastXData;
		if(isNaN(xDiff)) xDiff = 0;
		this.addToBounds(-xDiff, -xDiff, null, null);
	};

	plotter.zoomIn = function(){
		if(this.plotMode !== "line") return;
		this.zoom(true);
	};

	plotter.zoomOut = function(){
		if(this.plotMode !== "line") return;
		this.zoom(false);
	};

	plotter.zoom = function(zoomIn){
		var processZoomForFrame = function(frame, zoomFactor){
			var tCenter = (frame.dataMinX + frame.dataMaxX) * 0.5;
			var tRadius = (frame.dataMaxX - frame.dataMinX) * zoomFactor;
			frame.dataMinX = tCenter - tRadius;
			frame.dataMaxX = tCenter + tRadius;
		};

		var zoomFactor = 0.5 / 1.5;
		if(zoomIn){ // Zooming in to arbitrary levels is allowed.
			this.zoomLevel++;
		}else{
			if(this.zoomLevel !== 1){ // But you can't zoom out past 1
				this.zoomLevel--;
				zoomFactor = 0.5 * 1.5;
			}
			if(this.zoomLevel <= 1){
				// If we try to zoom out after zooming out all the way. Recalculate our bounds
				this.autoBounds();
				return;
			}
		}
		for(var i = 0; i < this.frames.length; ++i){
			frame = this.frames[i];
			processZoomForFrame(frame, zoomFactor);
		}
	};

	plotter.resetZoom = function(){
		this.zoomLevel = 1;
		this.autoBounds();
	};


	return plotter;
}

// the Frame object is responsible for the rendering and rendering-related coordinate transformations for a plot
function createFrame( ctx ) {
	var frame = {};
	frame.ctx = ctx; // store a reference to the context for quick reference

	// these are the bounds (in pixels) of the box containing the data, relative to the canvas
	frame.boxMinX = null;
	frame.boxMaxX = null;
	frame.boxMinY = null;
	frame.boxMaxY = null;

	// these are the bounds of the data values
	frame.dataMinX = null;
	frame.dataMaxX = null;
	frame.dataMinY = null;
	frame.dataMaxY = null;

	// captions
	frame.labelX = "";
	frame.minLabelX = "";
	frame.maxLabelX = "";
	frame.labelY = "";
	frame.minLabelY = "";
	frame.maxLabelY = "";
	frame.rotateLabelY = false;

	// ================ coordinates / transforms ================

	// transform screen (canvas-relative) x-coordinate to data x-coordinate
	frame.screenToDataX = function( x ) {
		return this.dataMinX + (x - this.boxMinX) * (this.dataMaxX - this.dataMinX) / (this.boxMaxX - this.boxMinX);
	};

	// transform screen (canvas-relative) y-coordinate to data y-coordinate
	frame.screenToDataY = function( y ) {
		return this.dataMaxY - (y - this.boxMinY) * (this.dataMaxY - this.dataMinY) / (this.boxMaxY - this.boxMinY);
	};

	// transform data x-coordinate to screen (canvas-relative) x-coordinate
	frame.dataToScreenX = function( x ) {
		return (x - this.dataMinX) * (this.boxMaxX - this.boxMinX) / (this.dataMaxX - this.dataMinX) + this.boxMinX;
	};

	// transform data y-coordinate to screen (canvas-relative) y-coordinate
	frame.dataToScreenY = function( y ) {
		if (this.dataMaxY == this.dataMinY) {
			return this.boxMinY + (this.boxMaxY - this.boxMinY) / 2;
		} else {
			return (this.dataMaxY - y) * (this.boxMaxY - this.boxMinY) / (this.dataMaxY - this.dataMinY) + this.boxMinY;
		}
	};

	// set captions for this frame
	frame.setCaptions = function( labelX, minLabelX, maxLabelX, labelY, minLabelY, maxLabelY, rotateLabelY ) {
		this.labelX = labelX;
		this.labelY = labelY;
		if (typeof rotateLabelY !== 'undefined')
			this.rotateLabelY = rotateLabelY;
		this.minLabelX = minLabelX;
		this.maxLabelX = maxLabelX;
		this.minLabelY = minLabelY;
		this.maxLabelY = maxLabelY;
		if(labelX.toLowerCase() !== "timestamp"){
			this.minLabelX = isFinite(minLabelX) ? minLabelX : 0;
			this.maxLabelX = isFinite(maxLabelX) ? maxLabelX : 0;
			this.minLabelY = isFinite(minLabelY) ? minLabelY : 0;
			this.maxLabelY = isFinite(maxLabelY) ? maxLabelY : 0;
		}
	};

	// compute plot frame/box bounds using caption text;
	// outerMinX/outerMaxX/outerMinY/outerMaxY specify outer bounds for the frame area (including captions)
	frame.fitBoxToCaptions = function( outerMinX, outerMaxX, outerMinY, outerMaxY ) {
		this.ctx.font = "12px sans-serif"; // need to set font before measure text size
		var minLabelSize = this.ctx.measureText( this.minLabelY ).width;
		var centLabelSize = this.rotateLabelY ? 10 : this.ctx.measureText( this.labelY ).width;
		var maxLabelSize = this.ctx.measureText( this.maxLabelY ).width;
		var yLabelSize = Math.max( minLabelSize, centLabelSize, maxLabelSize );
		this.boxMinX = outerMinX + 12 + yLabelSize;
		this.boxMaxX = outerMaxX - 14;
		this.boxMinY = outerMinY + 14;
		this.boxMaxY = outerMaxY - 20;
	};

	// clip subsequent drawing to inside box
	frame.clipBox = function() {
		this.ctx.beginPath();
		this.ctx.rect( this.boxMinX, this.boxMinY, this.boxMaxX - this.boxMinX, this.boxMaxY - this.boxMinY );
		this.ctx.clip();
	};

	// ================ drawing ================

	// draw the borders around the data (including tick marks as appropriate
	frame.drawBox = function() {
		var ctx = this.ctx;
		ctx.setTransform( 1, 0, 0, 1, 0.5, 0.5 );
		ctx.strokeStyle = "rgb(200,200,200)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo( this.boxMinX, this.boxMinY );
		ctx.lineTo( this.boxMinX, this.boxMaxY + 5 );
		ctx.moveTo( this.boxMinX - 5, this.boxMaxY );
		ctx.lineTo( this.boxMaxX, this.boxMaxY );
		ctx.moveTo( this.boxMaxX, this.boxMaxY + 5 );
		ctx.lineTo( this.boxMaxX, this.boxMinY );
		ctx.moveTo( this.boxMaxX, this.boxMinY );
		ctx.lineTo( this.boxMinX - 5, this.boxMinY );
		ctx.stroke();
	};

	// draw captions around the frame/box
	frame.drawCaptions = function() {
		var ctx = this.ctx;

		// prepare font (need to do this before measure size)
		ctx.font = "12px sans-serif";
		ctx.fillStyle = "rgb(0,0,0)";

		// get bounds for quick reference
		var boxMinX = this.boxMinX;
		var boxMaxX = this.boxMaxX;
		var boxMinY = this.boxMinY;
		var boxMaxY = this.boxMaxY;

		// draw text for x labels
		var xMinLabelSize = ctx.measureText( this.minLabelX ).width;
		var xMaxLabelSize = ctx.measureText( this.maxLabelX ).width;
		ctx.textBaseline = "top";
		ctx.textAlign = "center";
		ctx.fillText( this.labelX, (boxMinX + boxMaxX) * 0.5, boxMaxY + 5 );
		if (xMinLabelSize < 20) {
			ctx.fillText( this.minLabelX, boxMinX, boxMaxY + 5 );
		} else {
			ctx.textAlign = "left";
			ctx.fillText( this.minLabelX, boxMinX - 5, boxMaxY + 5 );
		}
		if (xMaxLabelSize < 20) {
			ctx.fillText( this.maxLabelX, boxMaxX, boxMaxY + 5 );
		} else {
			ctx.textAlign = "right";
			ctx.fillText( this.maxLabelX, boxMaxX + 5, boxMaxY + 5 );
		}

		// draw text for y labels
		ctx.textBaseline = "middle";
		ctx.textAlign = "right";
		ctx.fillText( this.maxLabelY, boxMinX - 8, boxMinY );
		ctx.fillText( this.minLabelY, boxMinX - 8, boxMaxY );
		if (this.rotateLabelY) {
			ctx.textAlign = "center";
			var offsetX = boxMinX - 12;
			var offsetY = (boxMinY + boxMaxY) * 0.5;
			ctx.save();
			ctx.translate( offsetX, offsetY );
			ctx.rotate( -Math.PI * 0.5 );
			ctx.fillText( this.labelY, 0, 0 );
			ctx.restore();
		} else {
			ctx.fillText( this.labelY, boxMinX - 8, (boxMinY + boxMaxY) * 0.5 );
		}
		//if (yUnits) ctx.fillText( unitsY, boxMinX - 8, (boxMinY + boxMaxY) * 0.5 + 7 );
	};

	// fix(soon): better comment (was: draws the data previously stored in plotter using the setData (or similar) method)
	frame.drawData = function( xData, yData ) {
		var xBoxMin = this.boxMinX;
		var xBoxMax = this.boxMaxX;
		var yBoxMin = this.boxMinY;
		var yBoxMax = this.boxMaxY;
		var xDataMin = this.dataMinX;
		var xDataMax = this.dataMaxX;
		var yDataMin = this.dataMinY;
		var yDataMax = this.dataMaxY;
		var xDataRaw = xData.data;
		var yDataRaw = yData.data;
		var len = xDataRaw.length;
		var first = true;
		var ctx = this.ctx;
		ctx.lineWidth = 2;
		ctx.beginPath();

		// if no y variation, just draw a straight line across from first point to last point
		if (yDataMax === yDataMin) {
			var yPlot = yBoxMin + (yBoxMax - yBoxMin) / 2;
			var xPlot = xBoxMin + (xBoxMax - xBoxMin) * (xDataRaw[ 0 ] - xDataMin) / (xDataMax - xDataMin);
			ctx.moveTo( xPlot, yPlot );
			xPlot = xBoxMin + (xBoxMax - xBoxMin) * (xDataRaw[ len - 1 ] - xDataMin) / (xDataMax - xDataMin);
			ctx.lineTo( xPlot, yPlot );

		// if many points, draw a subset
		} else if (len > xBoxMax - xBoxMin) {
			var xPlotLast = -1;
			var yMinLocal = 0;
			var yMaxLocal = 0;
			var countLocal = 0;
			for (var i = 0; i < len; i++) {
				var y = yDataRaw[ i ];
				if( y !== null){
					var inside = true;
					if (i + 1 < len && xDataRaw[ i + 1 ] < xDataMin) {
						inside = false;
					}
					if (i - 1 >= 0 && xDataRaw[ i - 1 ] > xDataMax) {
						inside = false;
					}
					if (inside) {
						var xPlot = xBoxMin + (xBoxMax - xBoxMin) * (xDataRaw[ i ] - xDataMin) / (xDataMax - xDataMin);

						// check whether we're at the start of a gap
						var startGap = false;
						if (i + 1 < len) {
							xPlotNext = xBoxMin + (xBoxMax - xBoxMin) * (xDataRaw[ i + 1 ] - xDataMin) / (xDataMax - xDataMin);
							if (xPlotNext - xPlot > 1)
								startGap = true;
						}

						// keep track of the min/max/count of y values between each pixel
						if (y < yMinLocal || countLocal == 0)
							yMinLocal = y;
						if (y > yMaxLocal || countLocal == 0)
							yMaxLocal = y;
						countLocal++;

						// if we have traversed a pixel, time to draw
						if (first || xPlot - xPlotLast >= 1 || startGap) {

							// draw to the min point over the last pixel
							var yPlot = yBoxMin + (yBoxMax - yBoxMin) * (1.0 - (yMinLocal - yDataMin) / (yDataMax - yDataMin));
							if (first) {
								ctx.moveTo( xPlot, yPlot );
							} else {
								ctx.lineTo( xPlot, yPlot );
							}

							// draw to the max point (if there was more than one)
							if (countLocal > 1) {
								yPlot = yBoxMin + (yBoxMax - yBoxMin) * (1.0 - (yMaxLocal - yDataMin) / (yDataMax - yDataMin));
								ctx.lineTo( xPlot, yPlot );

								// if there's an upcoming gap, draw the last point so that the line across the gap has the correct start
								if (startGap) {
									yPlot = yBoxMin + (yBoxMax - yBoxMin) * (1.0 - (y - yDataMin) / (yDataMax - yDataMin));
									ctx.lineTo( xPlot, yPlot );
								}
							}

							// reset for next pixel
							xPlotLast = xPlot;
							countLocal = 0;
							first = false;
						}
					}
				}
			}

		// if not too many points, draw them all
		} else {
			for (var i = 0; i < len; i++) {
				var inside = true;
				if (i + 1 < len && xDataRaw[ i + 1 ] < xDataMin) {
					inside = false;
				}
				if (i - 1 >= 0 && xDataRaw[ i - 1 ] > xDataMax) {
					inside = false;
				}
				if (inside) {
					var y = yDataRaw[ i ];
					if( y !== null ) {
						var xPlot = xBoxMin + (xBoxMax - xBoxMin) * (xDataRaw[ i ] - xDataMin) / (xDataMax - xDataMin);
						var yPlot = yBoxMin + (yBoxMax - yBoxMin) * (1.0 - (y - yDataMin) / (yDataMax - yDataMin));
						if (first)
							ctx.moveTo( xPlot, yPlot );
						else
							ctx.lineTo( xPlot, yPlot );
						first = false;
					}
				}
			}
		}
		ctx.stroke();
	};

	// draw text in a box with a border in the plot; x and y are in canvas/pixel coordinates
	frame.drawTextBox = function( x, y, text ) {
		var ctx = this.ctx;
		var size = ctx.measureText( text );
		var w = size.width + 10;
		var h = 20; // size.height + 20;
		var fill = ctx.fillStyle;
		ctx.fillStyle = "rgb(255,255,255)";
		if (x + w > this.boxMaxX) {
			x -= w;
		}
		if (y + h > this.boxMaxY) {
			y -= h;
		}
		ctx.drawRect( x, y, w, h );
		ctx.fillStyle = fill;
		ctx.textAlign = "left";
		ctx.drawTextAbsolute( text, x + 5, y + 10 );
	};

	// draw data (x coordinates and corresponding y coordinates) as dots
	frame.drawDataDots = function( xData, yData ) {
		var xDataRaw = xData.data;
		var yDataRaw = yData.data;
		var xBoxMin = this.boxMinX;
		var xBoxMax = this.boxMaxX;
		var yBoxMin = this.boxMinY;
		var yBoxMax = this.boxMaxY;
		var xDataMin = this.dataMinX;
		var xDataMax = this.dataMaxX;
		var yDataMin = this.dataMinY;
		var yDataMax = this.dataMaxY;
		var len = xDataRaw.length;
		var ctx = this.ctx;
		for (var i = 0; i < len; i++) {
			var xPlot = xBoxMin + (xBoxMax - xBoxMin) * (xDataRaw[ i ] - xDataMin) / (xDataMax - xDataMin);
			var yPlot = yBoxMin + (yBoxMax - yBoxMin) * (1.0 - (yDataRaw[ i ] - yDataMin) / (yDataMax - yDataMin));
			if(xPlot <= xBoxMax && xPlot >= xBoxMin && yPlot <= yBoxMax & yPlot >= yBoxMin){
				ctx.beginPath();
				ctx.arc( xPlot, yPlot, 2, 0, 6.2831853 ); // don't use drawCircle because don't want stroke, just fill
				ctx.fill();
			}
		}
	};

	// draw a set of histogram counts
	frame.drawHistogram = function( counts ) {
		var maxCount = Math.max.apply( null, counts );
		var bucketCount = counts.length;
		var bucketWidth = (this.boxMaxX - this.boxMinX) / bucketCount;
		var heightFactor = (this.boxMaxY - this.boxMinY) / maxCount;
		var ctx = this.ctx;
		ctx.lineWidth = 1;
		ctx.strokeStyle = "#009ddf";
		ctx.fillStyle = "#e9f6fd";
		for (var i = 0; i < bucketCount; i++) {
			var w = bucketWidth;
			var h = counts[ i ] * heightFactor;
			var x = this.boxMinX + i * bucketWidth;
			var y = this.boxMaxY - h;
			ctx.drawRect( x, y, w, h );
		}
	};

	// draw a left or right bound for fitting a model
	frame.drawBound = function( xData, yData, xScreen, left ) {
		var xMouseData = this.screenToDataX( xScreen );
		if (xScreen > this.boxMinX && xScreen < this.boxMaxX) {

			// find nearest index
			var nearestIndex = -1;
			var nearestDist = 0;
			var xDataRaw = xData.data;
			for (var i = 0; i < xDataRaw.length; i++) {
				var x = xDataRaw[ i ];
				var xDiff = x - xMouseData;
				if (xDiff < 0) xDiff = -xDiff;
				if (xDiff < nearestDist || nearestIndex == -1) {
					nearestDist = xDiff;
					nearestIndex = i;
				}
			}
			if (nearestIndex >= 0) {
				var x = xDataRaw[ nearestIndex ];
				var xScreen = this.dataToScreenX( x );
				var y = yData.data[ nearestIndex ];
				var yScreen = this.dataToScreenY( y, false );
				this.ctx.fillStyle = "#007daf";
				this.ctx.drawCircle( xScreen, yScreen, 7 );
				this.ctx.textAlign = "center";
				this.ctx.fillStyle = "#FFFFFF";
				this.ctx.font = 'bold 10px sans-serif';
				if (left) {
					ctx.drawTextAbsolute( "L", xScreen, yScreen );
				} else {
					ctx.drawTextAbsolute( "R", xScreen, yScreen );
				}
			}
		}
	};

	// highlight a value in a time series plot; show the x value of series at the selected y value
	frame.highlightValue = function( xData, yData, xMouseData, useTimestamp, presentIsZero, drawLine ) {

		// find nearest index (if mouse is within data bounds)
		var nearestIndex = -1;
		var nearestDist = 0;
		var xDataRaw = xData.data;
		// fix(later): should we use min( xData ) and max( xData )? is xData always monotonically increasing?
		if (xMouseData >= xDataRaw[ 0 ] && xMouseData <= xDataRaw[ xDataRaw.length - 1 ]) {
			for (var i = 0; i < xDataRaw.length; i++) {
				var x = xDataRaw[ i ];
				var xDiff = x - xMouseData;
				if (xDiff < 0) xDiff = -xDiff;
				if ((xDiff < nearestDist || nearestIndex == -1) && x >= frame.dataMinX && x <= frame.dataMaxX) {
					nearestDist = xDiff;
					nearestIndex = i;
				}
			}
		}
		if (nearestIndex >= 0) {

			var x = xDataRaw[ nearestIndex ];
			var xScreen = this.dataToScreenX( x );
			var ctx = this.ctx;
			if(typeof drawLine === 'undefined' || drawLine === true){
				// draw line
				ctx.lineWidth = 1;
				ctx.strokeStyle = "rgb(200,200,200)";
				ctx.drawLine( xScreen, this.boxMinY, xScreen, this.boxMaxY );
			}

			// display timestamp
			var showSeconds = false;
			if (xData.min && xData.max && xData.max - xData.min < 24 * 60 * 60)
				showSeconds = true;
			ctx.fillStyle = "rgb(0,0,0)";
			if(typeof useTimestamp !== 'undefined' && useTimestamp){
				if (x > 1000000) { // if standard unix timestamp (we'll assume small numbers are elapsed time, not timestamps)
					this.drawTextBox( xScreen, this.boxMinY, localTimestampToStr( x, showSeconds ) );
				} else {
					this.drawTextBox( xScreen, this.boxMinY, toFixedSafe( x, 3 ) + " seconds" ); // fix: use decimalPlaces?
				}
			}else if(typeof useTimestamp !== 'undefined' && !useTimestamp && xData.type === "timestamp"){
				// If we're not using timestamp but the xData is a timestamp, then we should show elapsed time values
				var elapsedTimeAtMouse = 0;
				if(presentIsZero){
					// Then the max timestamp should be regarded as "0".
					elapsedTimeAtMouse = (new Date(x * 1000) - new Date(xData.max * 1000)) / 1000;
				}else{
					// Then the min timestamp should be regarded as "0"
					elapsedTimeAtMouse = (new Date(x * 1000) - new Date(xData.min * 1000)) / 1000;
				}
				this.drawTextBox(xScreen, this.boxMinY, toFixedSafe(elapsedTimeAtMouse, 2));
			}else{
				this.drawTextBox( xScreen, this.boxMinY, toFixedSafe(x, 2) );
			}

			// display values
			var y = yData.data[ nearestIndex ];

			// make sure there's a value to display
			if( y !== null ){
				var yScreen = this.dataToScreenY( y );

				var outOfBounds = false;
				var offset = 0;
				if(y > frame.dataMaxY){
					yScreen = this.dataToScreenY(frame.dataMaxY);
					outOfBounds = true;
					offset = -5;
				}else if(y < frame.dataMinY){
					yScreen = this.dataToScreenY(frame.dataMinY);
					outOfBounds = true;
					offset = 5;
				}

				ctx.fillStyle = "#007daf";
				var text = yData.name + ": " + yData.format( y );
				this.drawTextBox( xScreen, yScreen - offset, text );
				if(!outOfBounds){
					ctx.drawCircle( xScreen, yScreen, 5 );
				}else{
					ctx.drawTriangle(xScreen, yScreen, xScreen + offset, yScreen - offset, xScreen - offset, yScreen - offset, false);
				}
			}
		}
	};

	// highlight a dot in a scatter plot; show the coordinates of the dot
	frame.highlightDot = function( xData, yData, xScreen, yScreen ) {
		var xVector = xData.data;
		var yVector = yData.data;
		var len = xVector.length;
		var bestDistSqd = 10 * 10;
		var bestIndex = -1;
		for (var i = 0; i < len; i++) {
			var xDiff = this.dataToScreenX( xVector[ i ] ) - xScreen;
			var yDiff = this.dataToScreenY( yVector[ i ] ) - yScreen;
			var distSqd = xDiff * xDiff + yDiff * yDiff;
			if (distSqd < bestDistSqd) {
				bestIndex = i;
			}
		}
		if (bestIndex >= 0) {
			var x = this.dataToScreenX( xVector[ bestIndex ] );
			var y = this.dataToScreenY( yVector[ bestIndex ] );
			var ctx = this.ctx;
			ctx.lineWidth = 1;
			ctx.strokeStyle = "rgb( 0, 0, 0 )";
			ctx.fillStyle = "rgb( 170, 170, 225 )";
			ctx.drawCircle( x, y, 2 );
			ctx.fillStyle = "rgb( 0, 0, 0 )";
			this.drawTextBox( x, y, "x: " + toFixedSafe(xVector[ bestIndex ], 2 ) + " y: " + toFixedSafe(yVector[ bestIndex ], 2 ) );
		}
	};

	// highlight a bar in a histogram; show the count for that bar
	frame.highlightHistogram = function( counts, xScreen, yScreen ) {
		var maxCount = Math.max.apply( null, counts );
		var bucketCount = counts.length;
		var bucketWidth = (this.boxMaxX - this.boxMinX) / bucketCount;
		var heightFactor = (this.boxMaxY - this.boxMinY) / maxCount;
		for (var i = 0; i < bucketCount; i++) {
			var w = bucketWidth;
			var h = counts[ i ] * heightFactor;
			var x = this.boxMinX + i * bucketWidth;
			var y = this.boxMaxY - h;
			if (xScreen > x && xScreen < x + w && yScreen > y && yScreen < y + h) {
				this.ctx.lineWidth = 1;
				this.ctx.strokeStyle = "rgb( 0, 0, 0 )";
				this.ctx.fillStyle = "#b9d6dd";
				this.ctx.drawRect( x, y, w, h );
				this.ctx.fillStyle = "rgb( 0, 0, 0 )";
				this.drawTextBox( x + w * 0.5, y + h, "count: " + counts[ i ] );
				break;
			}
		}
	};

	return frame;
}

// create a DataColumn object used to represent a vector of data and associated meta-data
function createDataColumn( name, data ) {
	var dataColumn = {};
	dataColumn.name = name;
	dataColumn.data = data;
	dataColumn.type = "numeric";
	dataColumn.units = "";
	dataColumn.decimalPlaces = 4;
	dataColumn.isDefault = true;
	dataColumn.rotateLabel = false;
	// These are the computed min and max values from the data
	dataColumn.min = null;
	dataColumn.max = null;
	// These can be used when visualizing the data, but have no direct relation to
	// the data.
	dataColumn.minBound = null;
	dataColumn.maxBound = null;
	dataColumn.format = function( value ) {
		if (value === undefined || value === null) {
			value = "";
		} else {
			if (this.type == 'timestamp') {
				var showSeconds = false;
				if (this.max && this.min && this.max - this.min < 24 * 60 * 60) {
					showSeconds = true;
				}
				if (value > 1000000) { // if standard unix timestamp (we'll assume small numbers are elapsed time, not timestamps)
					value = localTimestampToStr( value, showSeconds );
				} else {
					value = toFixedSafe( value, 3 ); // fix: use decimalPlaces?
				}
			} else if (this.type == 'numeric' && value.length !== 0) {
				value = toFixedSafe( parseFloat( value ), this.decimalPlaces );
			} else if ((this.type == 'latitude' || this.type == 'longitude') && value.length !== 0) {
				value = toFixedSafe( parseFloat( value ), 6 );
			} else if (this.type == 'document') {
				if (value && typeof value === "string") {
					var url = value;
					var slashPos = url.lastIndexOf( '/' );
					var fileName = url.substr( slashPos + 1 );
					value = '<a href="' + url + '">' + fileName + '</a>';
				}
			}
		}
		return value;
	};
	dataColumn.computeBounds = function() {
        var minMax = getMinMax(this.data);
		this.min = minMax["min"];
        this.max = minMax["max"];
		if(!isNumber(this.min)) this.min = 0;
		if(!isNumber(this.max)) this.max = 0;

	};
	return dataColumn;
}

// compute a histogram; returns and object with .counts (the bucket counts) and .centers (the bucket centers)
function computeHistogram( data, bucketCount, min, max ) {
	if (min === undefined)
		min = getMin(data);
	if (max === undefined)
		max = getMax(data);
	var bucketSize = (max - min) / (bucketCount - 1);

	// initialize counts and centers
	var counts = [];
	var centers = [];
	for (var i = 0; i < bucketCount; i++) {
		counts[ i ] = 0;
		centers[ i ] = min + i * (max - min) / (bucketCount - 1);
	}

	// update counts
	var len = data.length;
	for (var i = 0; i < len; i++) {
		var index = parseInt( (data[ i ] - min) / (max - min) * (bucketCount - 1), 10 );
		counts[ index ]++;
	}

	// return a histogram object
	histogram = {};
	histogram.counts = counts;
	histogram.centers = centers;
	return histogram;
}

// add our custom drawing methods to an HTML5 canvas context
function addDrawMethods(ctx) {

    // draw a line between the two points
    ctx.drawLine = function (x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    };

    // draw a 4-sided polygon with the given vertices
    ctx.drawQuad = function (x1, y1, x2, y2, x3, y3, x4, y4, stroke) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.lineTo(x4, y4);
        ctx.lineTo(x1, y1);
        if(typeof stroke == 'undefined'){
            stroke = true;
        }
        if(stroke){
            ctx.stroke();
        }
        ctx.fill();
    };

    // draw a rectangle with the lower-left in the given position
    ctx.drawRect = function (x, y, width, height, stroke) {
        ctx.fillRect(x, y, width, height);
        if(typeof stroke == 'undefined'){
            stroke = true;
        }
        if(stroke){
            ctx.strokeRect(x, y, width, height);
        }
    };

    // draw a rectangle centered on the given position
    ctx.drawRectCentered = function (x, y, width, height, stroke) {
        x -= width / 2;
        y -= height / 2;
        ctx.fillRect(x, y, width, height);
        if(typeof stroke == 'undefined'){
            stroke = true;
        }
        if(stroke){
            ctx.strokeRect(x, y, width, height);
        }
    };

    // draw a triangle with the given vertices
    ctx.drawTriangle = function (x1, y1, x2, y2, x3, y3, stroke) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.lineTo(x1, y1);
        ctx.closePath();
        if(typeof stroke == 'undefined'){
            stroke = true;
        }
        if(stroke){
            ctx.stroke();
        }
        ctx.fill();
    };

	// draw a circle centered on the given position
	ctx.drawCircle = function( x, y, radius, stroke, fill ) {
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, 6.2831853);
		if (stroke || typeof stroke == 'undefined') {
			ctx.stroke();
		}
		if (fill || typeof fill == 'undefined') {
			ctx.fill();
		}
	};

    // draw an arc centered on the given position, with the given start/end angles (in radians)
    ctx.drawArc = function (x, y, radius, startAngle, endAngle) {
        ctx.beginPath();
        ctx.arc(x, y, radius, startAngle, endAngle);
        ctx.stroke();
        ctx.fill();
    };

    // flip the coordinate system vertically
    ctx.flip = function () {
        ctx.translate(0, ctx.yMax);
        ctx.scale(1, -1);
    };

    // a helper function for setting the fill color from an (r, g, b) triplet
    ctx.setFillColor = function (r, g, b) {
        ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
    };

    // a helper function for setting the line color from an (r, g, b) triplet
    ctx.setStrokeColor = function (r, g, b) {
        ctx.strokeStyle = "rgb(" + r + "," + g + "," + b + ")";
    };

    // display an image right-side-up
    ctx.drawImageUp = function (image, x, y) {
        this.save();
        this.translate(x, y + image.height);
        this.scale(1, -1);
        this.drawImage(image, 0, 0);
        this.restore();
    };

    // fix(clean): remove this
    ctx.drawImageGood = ctx.drawImageUp;

    // draw an image centered on the given x, y coordinate (and right-side-up)
    ctx.drawImageCentered = function (image, x, y) {
        this.drawImageGood(image, x - image.width / 2, y - image.height / 2);
    };

    // draw text at the given position (using current font, color, textAlign, textBaseline, etc.)
    ctx.drawText = function (text, x, y) {
        if(text === undefined || !isNumber(x) || !isNumber(y)) return;
        ctx.save();
        ctx.translate(0, ctx.yMax);
        ctx.scale(1, -1);
        ctx.fillText(text, x, ctx.yMax - y);
        ctx.restore();
    };

    // draw text at the given position in screen coordinates (pixels, measured from top of the canvas);
    // uses current font, color, textAlign, textBaseline, etc.
    ctx.drawTextAbsolute = function (text, x, y) {
        if(text === undefined || !isNumber(x) || !isNumber(y)) return;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillText(text, x, y);
        ctx.restore();
    };

    // draw text centered within the canvas;
    // textLine2 is optional;
    // uses current font, color, etc.
    ctx.drawTextInCenter = function (textLine1, textLine2) {
        if(textLine1 === undefined || textLine2 === undefined) return;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (textLine2) {
            ctx.drawText(textLine1, (ctx.xMin + ctx.xMax) * 0.5, (ctx.yMin + ctx.yMax) * 0.5 + 12);
            ctx.drawText(textLine2, (ctx.xMin + ctx.xMax) * 0.5, (ctx.yMin + ctx.yMax) * 0.5 - 12);
        } else {
            ctx.drawText(textLine1, (ctx.xMin + ctx.xMax) * 0.5, (ctx.yMin + ctx.yMax) * 0.5);
        }
    };
}

// add an initial half-pixel translation so that pixels can be accessed with integer coordinates
function setInitTransform(ctx) {
    var height = ctx.yMax - ctx.yMin + 1;
    ctx.setTransform(1, 0, 0, -1, 0.5, height - 0.5);
}

// return a color for the value (assuming a range between min and max)
function colorSpectrum( value, min, max ) {
	var range = max - min;
	var factor = range > 1e-8 ? parseInt( 255 * (value - min) / range, 10 ) : 128;
	var r = factor;
	var b = 255 - factor;
	return "rgb(" + r + ",0," + b + ")";
}

function colorSpectrumObject(value, min, max){
    var range = max - min;
    var factor = range > 1e-8 ? parseInt( 255 * (value - min) / range, 10 ) : 128;
    var r = factor;
    var b = 255 - factor;
    return {"red":r, "blue":b};
}

// (x,y) is the point we want the value for
// (x1,y1) is the top left point
// (x2,y2) is the bottom right point
function interpolateBilinear(x, y, x1, y1, x2, y2, q11, q21, q12, q22){
    var result = q11 * (x2-x) * (y2-y);
    result += q21 * (x-x1) * (y2-y);
    result += q12 * (x2-x) * (y-y1);
    result += q22 * (x-x1) * (y-y1);
    result /= ((x2-x1) * (y2-y1));
    return result;
}

function interpolateFill(ctx, x1, y1, x2, y2, topLeft, topRight, bottomLeft, bottomRight){
    // On a display where 1 css pixel != 1 device pixel (retina displays) this will
    // have more pixels than we expect. We'll have to handle that.
    var imgData = ctx["createImageData"](x2-x1, y2-y1);

    // Interpolate
    var width = imgData.width;
    var height = imgData.height;
    for(var x = 0; x < width; x++){
        for(var y = 0; y < height; y++){
            // Needed to make sure to add x1 and y1 to x and y
            var redValue = interpolateBilinear(x + x1, y + y1, x1, y1, x2, y2, topLeft["red"], topRight["red"], bottomLeft["red"], bottomRight["red"]);
            var blueValue = interpolateBilinear(x + x1, y + y1, x1, y1, x2, y2, topLeft["blue"], topRight["blue"], bottomLeft["blue"], bottomRight["blue"]);

            var i = ((y * width) + x) * 4;
            // Red
            imgData.data[i] = redValue;

            // Green
            // imgData.data[i + 1] = 0; // We only interpolate red and blue.

            // Blue
            imgData.data[i + 2] = blueValue;

            // Alpha
            imgData.data[i + 3] = 255;
        }
    }
    // Put it back
    ctx["putImageData"](imgData, x1, y1);
}

// Loops over an array of numbers and returns
// {"min":min, "max":max}
function getMinMax(array){
    var tempMin = array[0];
    var tempMax = array[0];
    var arrayLen = array.length;
    for(var i = 1; i < arrayLen; ++i){
        var value = array[i];
        // If the tempValue is null, always replace it. Otherwise if the value
        // is less than the tempMin and the value is not null, replace tempMin.
        // Extra checks required because null is < everything.
        if(tempMin === null || (value < tempMin) && value !== null) tempMin = value;
        if(value > tempMax) tempMax = value;
    }
    return {"min" : tempMin, "max" : tempMax};
}

// returns true if can be converted to a finite float
function isNumber( x ) {
    return !isNaN( parseFloat( x ) ) && isFinite( x );
}

function toFixedSafe(value, decimalPlaces){
    if(typeof value.toFixed !== 'undefined'){
        return value.toFixed(decimalPlaces);
    }
    return value;
}

// format a javascript Date object as a date string in local time
function dateStr( date ) {
    return (date.getFullYear() || 0) + '-' + ((date.getMonth() + 1) || 0) + '-' + (date.getDate() || 0);
}


// format a javascript Date object as a time string in local time
function timeStr( date, showSeconds ) {
    var minutes = date.getMinutes() || 0;
    var hours = date.getHours() || 0;
    if (minutes < 10) minutes = "0" + minutes;
    var str = hours + ':' + minutes;
    if (showSeconds) {
        var seconds = date.getSeconds() || 0;
        if (seconds < 10) seconds = "0" + seconds;
        str += ':' + seconds;
    }
    return str;
}


// format a javascript Date object as a date string in UTC time
function dateStrUTC( date ) {
    var year = date.getUTCFullYear() || 0;
    var month = (date.getUTCMonth() + 1) || 0;
    var day = date.getUTCDate() || 0;
    return year + '-' + month + '-' + day;
}


// format a javascript Date object as a time string in UTC time
function timeStrUTC( date, showSeconds ) {
    var minutes = date.getUTCMinutes() || 0;
    var hours = date.getUTCHours() || 0;
    if (minutes < 10) minutes = "0" + minutes;
    var str = hours + ':' + minutes;
    if (showSeconds) {
        var seconds = date.getUTCSeconds() || 0;
        if (seconds < 10) seconds = "0" + seconds;
        str += ':' + seconds;
    }
    return str;
}


// format a javascript Date object as a timestamp with date and time
function dateTimeStr( date, showSeconds ) {
    return dateStr( date ) + " " + timeStr( date, showSeconds );
}


// convert a timestamp (seconds since epoch *local*) to a string
// normally an epoch timestamp is measured relative to the UTC epoch; we're doing things differently!
function localTimestampToStr( timestamp, showSeconds ) {
	return moment(timestamp * 1000).format('YYYY/M/D H:mm:ss.SSS');
//    var date = new Date( timestamp * 1000 ); // create a date assuming timestamp is in UTC epoch seconds
//    return dateStrUTC( date ) + " " + timeStrUTC( date, showSeconds ); // convert to string as would be viewed in UTC; this actually local
}


// the X-coordinate of the click
function objectClickX( e ) {
    var x = 0;
    if (e.offsetX || e.offsetX === 0) { // Opera/Chrome
        x = e.offsetX;
    } else if (e.layerX || e.layerX === 0) { // Firefox
        x = e.layerX;
    }
    return x;
}

// the Y-coordinate of the click
function objectClickY( e ) {
    var y = 0;
    if (e.offsetY || e.offsetY === 0) { // Opera/Chrome
        y = e.offsetY;
    } else if (e.layerY || e.layerY === 0) { // Firefox
        y = e.layerY;
    }
    return y;
}
