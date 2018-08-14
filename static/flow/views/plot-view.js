var createPlotCanvas = function (className, id, parent, mouseDownHandler, mouseMoveHandler, mouseUpHandler, useManyplot) {
    let canvas = $('<canvas>', { class: className, id: 'bc_' + id }).prop({ width: 300, height: 145 }).appendTo(parent);
    canvas.mousedown(mouseDownHandler);
    canvas.mousemove(mouseMoveHandler);
    canvas.mouseup(mouseUpHandler);
    let canvasElement = $(canvas)[0];

    if (!useManyplot) {
        // create a plot and return a reference to a new TimeSeries object
        return _createSmoothiePlot(canvasElement);
    } else {
        return;
    }
}

// Optional alternative chart style for small plots to show live data streams
var _createSmoothiePlot = function (canvasElement) {
    var smoothiePlot = new SmoothieChart(
        {
            grid: { fillStyle: '#fff', strokeStyle: 'rgba(119,119,119,0.2)', millisPerLine: 3000 },
            labels: { fillStyle: '#5a5a5a' }, tooltip: true, maxValueScale: 1.05, minValueScale: 1.05,
            yMinFormatter: function (min) {
                return parseFloat(min).toFixed(0);
            },
            yMaxFormatter: function (max) {
                return parseFloat(max).toFixed(0);
            },
            scaleSmoothing: 0.25
        });
    var plotTimeSeries = new TimeSeries();

    smoothiePlot.addTimeSeries(plotTimeSeries, { lineWidth: 4, strokeStyle: '#0592af', fillStyle: 'rgba(0,0,0,0.05)' });
    smoothiePlot.streamTo(canvasElement, 500);
    return { plot: smoothiePlot, series: plotTimeSeries };
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
            Background: "#fff",
            AxisLine: "#333",
            AxisLabel: "#fff"
        };
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
        // update smoothiechart
        if (block.series) {
            block.series.append(new Date().getTime(), block.value);
            block.series.resetBounds();
            block.plot.updateValueRange();
        }
    }
}
