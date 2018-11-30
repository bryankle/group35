function logoutUser() {
    console.log('Logging user out');
    $.ajax({
        url: '/logout',
        type: 'GET',
        success: function(result) {
            console.log('User logged out')
            window.location.reload(true);
        }
    })
}
