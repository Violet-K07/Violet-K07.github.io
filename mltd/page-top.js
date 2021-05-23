document.getElementById("page-top").style.display = "none";
window.onscroll = function () { 
	if (document.documentElement.scrollTop + document.body.scrollTop > 100)/*鼠标滚动距离*/ { 
		document.getElementById("page-top").style.display = "block"; /*大于显示*/
	} 
	else { 
		document.getElementById("page-top").style.display = "none"; /*小于隐藏*/
	} 
} 
$(function(){
	$("#page-top").click(function(){ 
		$("html,body").animate({
			scrollTop:"0px"
		},300);
	});  
});
