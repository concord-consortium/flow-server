var createPlotCanvas = function (className, id, parent, mouseDownHandler, mouseMoveHandler, mouseUpHandler, useManyplot) {
    let canvas = $('<canvas>', { class: className, id: 'bc_' + id }).prop({ width: 300, height: 145 }).appendTo(parent);
    canvas.mousedown(mouseDownHandler);
    canvas.mousemove(mouseMoveHandler);
    canvas.mouseup(mouseUpHandler);
    let canvasElement = $(canvas)[0];

    if (!useManyplot) {
        // TODO: implement alternative plot
        return;
    } else {
        return;
    }
}

var displayPlotSeries = function (block, useManyplot) {
    var canvas = document.getElementById('bc_' + block.id);
    block.view.xData = createDataColumn('last 30 seconds', []);
    block.view.xData.hideAxisLabel = true;
    block.view.xData.type = 'timestamp';
    block.view.yData = createDataColumn('value', []);

    // Initialization needed for manyplot renders once canvas has been completed
    if (useManyplot) {
        const opts = {
            LineColor: "rgb(0,125,175)",
            CaptionColor: "rgb(0,125,175)",
            Background: "#fff",
            AxisLine: "#333",
            AxisLabel: "#fff"
        };
        // Second parameter = true = always show individual plots via manyplot for the small plotter
        block.view.plotHandler = createPlotHandler(canvas, true, opts);
        block.view.plotHandler.plotter.addYaxisBuffer(10);
        block.view.plotHandler.plotter.showTimeHighlight = false;
        var dataPairs = [
            {
                'xData': block.view.xData,
                'yData': block.view.yData,
            }
        ];
        block.view.plotHandler.plotter.setData(dataPairs);
        block.view.plotHandler.drawPlot(null, null);
    }
}

var updatePlot = function (block, timestamp, useManyplot) {
    if (useManyplot) {
        if (block.value !== null && !isNaN(block.value)) {
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
    } else {
        // TODO: If using alternative plot library, handle update here
    }
}
