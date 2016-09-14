function xhttp(){
	var uid = document.getElementById('uid').value;
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
    	var data = JSON.parse(this.responseText);
    	var len = data.length;
    	for(var i = 0 ;i<len;i++){
    		if(data[i].uid===uid){
    			document.getElementById('legacy_no').value = data[i].legacyno;
    			document.getElementById('name').value = data[i].name;
    			document.getElementById('address').value = data[i].address;
    			document.getElementById('designated_partner').value = data[i].designatedpartner;
    			document.getElementById('pan').value = data[i].pan
    		}
    }
    }
  };
  xhr.open("GET", "pan.json", true);
  xhr.send();
}