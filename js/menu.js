$(document).ready(function() {
  
  $('body').addClass('js');
  
  var $menu = $('#side-menu'),
    $menulink = $('.side-menu-link'),
    $wrap = $('#wrap');
  
  $menulink.click(function() {
    $menulink.toggleClass('active');
    $wrap.toggleClass('active');
    return false;
  });
});