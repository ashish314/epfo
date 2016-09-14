$("#uid").focusout(function (){
    var uid = document.getElementById('uid').value;
    $.ajax
    ({
        type  : 'GET',
        url   : "http://localhost:8000/autoFill/?uid="+uid,
        error : function (res){
            alert(res.responseJSON.message);
        },
        success : function (res){
            document.getElementById('legacy_number').value = res.result.BPEXT;
            document.getElementById('name').value = res.result.FULL_NAME;
            document.getElementById('address').value = "address to come";
            document.getElementById('designated_partner').value = res.result.ZZFULL_NAME;
            document.getElementById('pan').value = res.result.PAN;
        },
    });
});

$("#legacy_number").focusout(function (){
    var legacy_number = document.getElementById('legacy_number').value;
    $.ajax
    ({
        type  : 'GET',
        url   : "http://localhost:8000/autoFill/?legacy_number="+legacy_number,
        error : function (res){
            alert(res.responseJSON.message);
        },
        success : function (res){
            document.getElementById('uid').value = res.result.PARTNER;
            document.getElementById('name').value = res.result.FULL_NAME;
            document.getElementById('address').value = "address to come";
            document.getElementById('designated_partner').value = res.result.ZZFULL_NAME;
            document.getElementById('pan').value = res.result.PAN;
        },
    });
});