// tests found in test/qunit/script-tests.js

$(".sign-in").on('click', function() {
    $(".landing-container-firstview").animate({
           left: '-100%'
       }, 300, function() {
           $(".landing-container-firstview").css('left', '150%');
           $(".landing-container-firstview").appendTo('.landingcontainer');

           $(".landing-container-secondview").css({
               display: 'block',
               position: 'relative'
           });

           $(".landing-container-secondview").animate({
               left: '0%'
           }, 300);
       });
});

// no work :(
$(".logout").on('click', function() {
  console.log('logging out!');
    $.ajax({
      url: '/logout',
      type: 'POST',
      success: function(){
        // window.location = '/';
        window.location.href = '/';
      }
    });
});

function activateLightBox (toadd) {
    $(toadd).css("display", "block");
    $("div").first().addClass("overlay");
}

function deactivateLightBox (toremove) {
    $(toremove).css("display", "none");
    $("div").first().removeClass("overlay");
}

$(".sign-in").on('click', function() {
    slideEffect();
});

$(".add-class").on('click', function() {
    activateLightBox(".add-class-lightbox");
});

$(".add-student").on('click', function() {
    activateLightBox(".add-student-lightbox");
});

$(".exit-button-class").on('click', function() {
    deactivateLightBox(".add-class-lightbox");
});

$(".exit-button-student").on('click', function() {
    deactivateLightBox(".add-student-lightbox");
});
