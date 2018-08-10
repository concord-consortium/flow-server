var createPlotCanvas = function (className, id, parent, mouseDownHandler, mouseMoveHandler, mouseUpHandler, useSmoothiePlot) {
  let blockId = 'bc_' + id;
  let canvas = $('<canvas>', { class: className, id: 'bc_' + id }).prop({width: 300, height: 150}).appendTo(parent);
  canvas.mousedown(mouseDownHandler);
  canvas.mousemove(mouseMoveHandler);
  canvas.mouseup(mouseUpHandler);

  if (useSmoothiePlot) {
    let canvasElement = $(canvas)[0];
    // create a plot and return a reference to a new TimeSeries object
    return createSmoothiePlot(canvasElement);
  } else {
    return;
  }
}

var createSmoothiePlot = function(canvasElement){

  let smoothiePlot = new SmoothieChart({ grid: { fillStyle: '#ffffff', strokeStyle: 'rgba(119,119,119,0.12)', millisPerLine: 3000, borderVisible: false }, labels: { fillStyle: '#5a5a5a' } });
  smoothiePlot.streamTo(canvasElement);
  let plotTimeSeries = new TimeSeries();
  smoothiePlot.addTimeSeries(plotTimeSeries, {lineWidth:2,strokeStyle:'#0592af',fillStyle:'rgba(0,0,0,0.05)'});

  return plotTimeSeries;
}

var displayManyPlotSeries = function (block) {
  var canvas = document.getElementById('bc_' + block.id);
  block.view.plotHandler = createPlotHandler(canvas);
  block.view.plotHandler.plotter.addYaxisBuffer(10);
  block.view.plotHandler.plotter.showTimeHighlight = false;
  block.view.xData = createDataColumn('last 30 seconds', []);
  block.view.xData.hideAxisLabel = true;
  block.view.xData.type = 'timestamp';
  block.view.yData = createDataColumn('value', []);
  var dataPairs = [
      {
          'xData': block.view.xData,
          'yData': block.view.yData,
      }
  ];
  block.view.plotHandler.plotter.setData(dataPairs);
  block.view.plotHandler.drawPlot(null, null);
}