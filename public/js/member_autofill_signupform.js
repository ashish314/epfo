$("#uid").focusout(function (){
    var uid = document.getElementById('uid').value;
    $.ajax
    ({
        type  : 'GET',
        url   : "http://localhost:8000/autoFill/?uid="+uid+'&bpkind=0001',
        error : function (res){
            alert(res.responseJSON.message);
        },
        success : function (res){
            document.getElementById('legacy_number').value = res.result.BPEXT;
            document.getElementById('name').value          = res.result.FULL_NAME;
            document.getElementById('address').value       = "address to come";
            document.getElementById('employer_name').value = "employer name to come";
            document.getElementById('addhar').value        = res.result.ADDHAR;
            document.getElementById('employer_name').value = res.result.employer_name;
        },
    });
});

$("#legacy_number").focusout(function (){
    var legacy_number = document.getElementById('legacy_number').value;
    $.ajax
    ({
        type  : 'GET',
        url   : "http://localhost:8000/autoFill/?legacy_number="+legacy_number+'&bpkind=0001',
        error : function (res){
            alert(res.responseJSON.message);
        },
        success : function (res){
            document.getElementById('uid').value = res.result.PARTNER;
            document.getElementById('name').value = res.result.FULL_NAME;
            document.getElementById('address').value = "address to come";
            document.getElementById('employer_name').value = "employer name to come";
            document.getElementById('addhar').value = res.result.ADDHAR;
            document.getElementById('employer_name').value = res.result.employer_name;
        },
    });
});