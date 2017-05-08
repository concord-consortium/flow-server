function blockComponent(){
  return Vue.component('block', {
    template: [
      '<div class="flowBlock" :id="block.id">',
        '{{block}}',
      '</div>'
    ].join('\n'),
    props: [
      'block'
    ]
  });
}
