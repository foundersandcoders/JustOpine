$(document).ready(function(){
    if (document.title.match(/Incorrect username\/password/) || document.title.match(/Missing username\/password/)) {
        setTimeout(function(){
            window.location.href = "/";
        }, 2000);
    } else if (document.title.match(/No classes registered/)) {
        setTimeout(function(){
            window.location.href = "/classes";
        }, 3300);
    } else if (document.title.match(/Added teacher/)) {
        setTimeout(function(){
            window.location.href = "/registration";
        }, 2700);
    // } else if (document.title.match(/Incomplete response/)) {
    //     setTimeout(function(){
    //         window.history.back();
    //     }, 2700);
    }

});
$('.go-back').click(function() {
    window.history.back();
});
