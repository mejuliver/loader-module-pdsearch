if( window.pdsearchassets ){

	window.pdsearchassets.forEach(function(el){
		if( el.type == 'css' ){
			var link = document.createElement('link');
			link.setAttribute('type','text/css');
			link.setAttribute('rel','stylesheet');
			link.setAttribute('href',el.src);
			document.querySelector('head').appendChild(link);
		}
		if( el.type == 'js' ){
			var link = document.createElement('script');
			link.setAttribute('src',el.src);
			document.querySelector('body').appendChild(link);
		}
		if( el.type == 'script' ){
			var link = document.createElement('script');
			link.innerHTML = el.src;
			document.querySelector('body').appendChild(link);
		}
		if( el.type == 'style' ){
			var link = document.createElement('style');
			link.innerHTML = el.src;
			document.querySelector('head').appendChild(link);
		}
	});
}
