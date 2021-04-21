import PouchDB from 'pouchdb-browser';
import axios from 'axios';
import Fuse from 'fuse.js';
import './style.scss';

let timer;

function debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };

        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

const pdsearch = {

	init(){
		let _self = this;
		
		// set up app db
		this.initAppDB();

		// loop through all class pdsearch class
		let _els = document.querySelectorAll('.pdsearch');

		_els.forEach(function(el,i){

			let url = ( el.getAttribute('data-url') ) ? el.getAttribute('data-url') : false;
			let spellchecker = ( el.getAttribute('data-spellchecker')  ) ? ( el.getAttribute('data-spellchecker').toLowerCase() == 'true' ) : true;
			let recentsearches = ( el.getAttribute('data-recentsearches') ) ? ( el.getAttribute('data-recentsearches').toLowerCase() == 'true' ) : true;
			let storage = ( el.getAttribute('data-storage'  ) ) ? ( el.getAttribute('data-storage').toLowerCase() == 'true' ) : true;
			let customdb = ( el.getAttribute('data-db') ) ? el.getAttribute('data-db') : false;
			// -- notes
			// url must be defined
			// spellchecker, storage default to true

			if( customdb ){
				_self.initDB(customdb,el);
			}

			if( !url ){
				console.log('pdsearch element bind '+i+' data-url must be define!');
				return;
			} // if no url then stop the plugin


			el.setAttribute('data-marker',0); // add marker for the spellchecker
			let wrapper = document.createElement('div');
			let newel = document.querySelectorAll('.pdsearch')[i];

			wrapper.classList.add('pdsearch-wrapper','pdsearch-container');
			wrapper.setAttribute('id','pdsearch_'+i);
			wrapper.style.position = 'relative';
			newel.parentNode.insertBefore(wrapper, newel);
			wrapper.appendChild(newel);

			// create search results list element
			let sub = document.createElement('div');
			sub.classList.add('subwrapper');
			sub.style.position = 'relative';

			if( spellchecker ){
				let spelldiv = document.createElement('div');
				spelldiv.classList.add('spellchecker-wrapper','spellchecker-container');
				spelldiv.style.position = 'relative';
				spelldiv.innerHTML = '<div class="spellbox" style="display:none;position:absolute;top:0px;left:0px"></div>';
				document.querySelectorAll('.pdsearch')[i].closest('.pdsearch-wrapper').appendChild(spelldiv);				
			}

			let recents = ( recentsearches ) ? '<p class="recentText" style="display:none">Recent searches:</p><div class="pdsearch-recentsearches"></div>' : '';
			sub.innerHTML = '<div class="pdsearch-sub pdsearch-searchresults pdsearch-results">'+recents+'<div class="results-div"></div></div>';
			document.querySelectorAll('.pdsearch')[i].closest('.pdsearch-wrapper').appendChild(sub);
			// -- add search spinner
			let spinner = document.createElement('div');
				spinner.classList.add('search-spinner-wrapper');
				spinner.innerHTML = '<div class="search-spinner"><div class="sk-circle1 sk-circle"></div><div class="sk-circle2 sk-circle"></div><div class="sk-circle3 sk-circle"></div><div class="sk-circle4 sk-circle"></div><div class="sk-circle5 sk-circle"></div><div class="sk-circle6 sk-circle"></div><div class="sk-circle7 sk-circle"></div><div class="sk-circle8 sk-circle"></div><div class="sk-circle9 sk-circle"></div><div class="sk-circle10 sk-circle"></div><div class="sk-circle11 sk-circle"></div><div class="sk-circle12 sk-circle"></div></div>';
				el.closest('.pdsearch-wrapper').appendChild(spinner);
			// -- end search spinner
			// -- add close btn
			let closeEl = document.createElement('div');
				closeEl.classList.add('btn-clear');
				closeEl.href = '#';
				closeEl.addEventListener('click',function(){
					this.closest('.pdsearch-wrapper').querySelector('.pdsearch.active').value = '';
					this.style.display = 'none';
					this.closest('.pdsearch-wrapper').querySelector('.pdsearch-sub').classList.remove('active');
					if( this.closest('.pdsearch-wrapper').querySelector('.spellbox') ){
						this.closest('.pdsearch-wrapper').querySelector('.spellbox').style.display = 'none';
					}
					_self.emptydiv(this.closest('.pdsearch-wrapper').querySelector('.results-div'));
				});

			el.closest('.pdsearch-wrapper').appendChild(closeEl);

			// -- end close btn

			// -- on focus
			el.addEventListener('focus',function(){
				let recentsearchesdb = new PouchDB('recentsearches');
				let activeEl = this.closest('.pdsearch-wrapper');
				let $this = this;

				activeEl.querySelector('.search-spinner-wrapper').style.display = 'none';
				activeEl.querySelector('.btn-clear').style.display = 'none';

				if( this.value != '' ){
					activeEl.querySelector('.btn-clear').style.display = 'block';
				}

				document.querySelectorAll('.pdsearch-wrapper').forEach(function(el){
					el.querySelector('.pdsearch-sub').classList.remove('active');
				});

				if( recentsearches ){

					recentsearchesdb.allDocs({
						include_docs : true
					}).then(function(docs){
						if( docs.total_rows > 0 ){
							if( activeEl.querySelector('.recentText') ){
								if( docs.total_rows > 0 ){
									activeEl.querySelector('.recentText').style.display = 'block';
								}						
							}
							
							activeEl.querySelector('.pdsearch-sub').classList.add('active');
						}else{
							if( $this.closest('.pdsearch-wrapper').querySelector('.recentText') ){
								activeEl.querySelector('.recentText').style.display = 'none';
							}
						}
						
						if( activeEl.querySelector('.recentText') ){
							_self.emptydiv(activeEl.querySelector('.pdsearch-recentsearches'));
							if( docs.total_rows > 0 ){
								activeEl.querySelector('.recentText').style.display = 'block';
							}
						}
						
						docs.rows.forEach(function(el){
							let newel = document.createElement('span');
								newel.classList.add('recent-item');
								newel.textContent = el.doc.keyword;
								newel.addEventListener('click',function(){
									let elid = '#'+this.closest('.pdsearch-wrapper').getAttribute('id');
									activeEl.querySelector('.pdsearch').value = this.textContent;

									_self.autosuggestion(this.textContent,elid,customdb)
								});
							if( activeEl.querySelector('.pdsearch-recentsearches' ) ){
								activeEl.querySelector('.pdsearch-recentsearches').appendChild(newel);
							}
						});

					});
				}

				if( document.querySelector('.pdsearch.active') ){
					document.querySelector('.pdsearch.active').classList.remove('active');
				}
				this.classList.add('active');

				if( activeEl.querySelector('.pdsearch-recentsearches') && activeEl.querySelector('.pdsearch-recentsearches').querySelectorAll('span').length > 0 ){
					if( activeEl.querySelector('.recentText') ){
						activeEl.querySelector('.recentText').style.display = 'block';	
					}
					
					activeEl.querySelector('.pdsearch-sub').classList.add('active');
				}

			});

			if( el.closest('form') ){

				el.closest('form').onsubmit = function(){

					if( this.querySelector('input.active') ){
						this.querySelector('input.active').classList.add('active-recentsearches','cancelled');

						if( this.querySelector('input.active').closest('.pdsearch-wrapper').querySelector('.spellbox') ){
							this.querySelector('input.active').closest('.pdsearch-wrapper').querySelector('.spellbox').style.display = 'none';	
						}
						this.querySelector('input.active').closest('.pdsearch-wrapper').querySelector('.pdsearch-sub').classList.remove('active');

						
						if(  (this.querySelector('.pdsearch.active').getAttribute('data-recentsearches') &&  this.querySelector('.pdsearch.active').getAttribute('data-recentsearches').toLowerCase() === 'true' ) || !this.querySelector('.pdsearch.active').getAttribute('data-recentsearches') ){
							// -- trigger save to recent searches
							_self.saveRecentsearches(this.querySelector('input.active').value,this.querySelector('input.active').closest('.pdsearch-wrapper'));

						}	
					}
					
				}
			}

			// -- keypress
			el.addEventListener('keypress',function(){

				if (event.which === 13 || event.keyCode === 13 || event.key === "Enter"){
					this.classList.add('cancelled');
					if( this.closest('.pdsearch-wrapper').querySelector('.spellbox') ){
						this.closest('.pdsearch-wrapper').querySelector('.spellbox').style.display = 'none';	
					}
					this.closest('.pdsearch-wrapper').querySelector('.pdsearch-sub').classList.remove('active');

					return;
				}
				
				_self.computeMarker(this);

				if( this.closest('.pdsearch-wrapper').querySelector('.spellbox') ){
					this.closest('.pdsearch-wrapper').querySelector('.spellbox').style.display = 'none';	
				}
				
				this.closest('.pdsearch-wrapper').querySelector('.pdsearch-sub').classList.remove('active');

				if( this.value != '' ){
					this.closest('.pdsearch-wrapper').querySelector('.btn-clear').style.display = 'block';
					this.closest('.pdsearch-wrapper').querySelector('.search-spinner-wrapper').style.display = 'none';
				}
				let elid = '#'+this.closest('.pdsearch-wrapper').getAttribute('id');
				// -- do the the spellchecking
				_self.searchSpell( this.value,elid);


			});

			// -- keydown
			el.addEventListener('keydown',function(){
				let $this = this;
				let key = event.keyCode || event.charCode;
				let elid = '#'+this.closest('.pdsearch-wrapper').getAttribute('id');

			    if( key == 8 || key == 46 ){ // if backspace or delete
			    	_self.computeMarker(this);			    	

			    	setTimeout(function(){
			    		if( $this.value == '' ){
							// empty result divs first
							_self.emptydiv($this.closest('.pdsearch-wrapper').querySelector('.results-div'));
							if( $this.closest('.pdsearch-wrapper').querySelector('.spellbox') ){
								$this.closest('.pdsearch-wrapper').querySelector('.spellbox').style.display = 'none';
							}
							$this.closest('.pdsearch-wrapper').querySelector('.pdsearch-sub').classList.remove('active');	
							$this.closest('.pdsearch-wrapper').querySelector('.btn-clear').style.display = 'none';
				    	}else{
				    		_self.searchSpell($this.value,elid);
				    		$this.closest('.pdsearch-wrapper').querySelector('.btn-clear').style.display = 'block';
				    		$this.closest('.pdsearch-wrapper').querySelector('.search-spinner-wrapper').style.display = 'none';
				    	}
			    	},10);
			    }
				
			});

			// -- keyup
			el.addEventListener('keyup',debounce(function(){
				let elid = '#'+this.closest('.pdsearch-wrapper').getAttribute('id');

				_self.computeMarker(this);		

				if( this.value <= 4 ){
					// empty result divs first
					_self.emptydiv(this.closest('.pdsearch-wrapper').querySelector('.results-div'));
					if( this.closest('.pdsearch-wrapper').querySelector('.spellbox') ){
						this.closest('.pdsearch-wrapper').querySelector('.spellbox').style.display = 'none';
					}
					this.closest('.pdsearch-wrapper').querySelector('.pdsearch-sub').classList.remove('active');	
		    	}else{
		    		_self.autosuggestion(this.value,elid,customdb);
		    	}
			},800)
			);

		});

		document.querySelectorAll('.spellbox').forEach(function(el){
			el.addEventListener('click',function(){
				let el = this.closest('.pdsearch-wrapper').querySelector('.pdsearch');
				let data = el.value.split(' ');
				data[data.length-1] = this.textContent;
				el.value = data.join(' ');
				this.style.display = 'none';
			});
		});

		document.addEventListener('mousedown',function(){
			
			if( ( event.target.classList.contains('pdsearch-wrapper') || event.target.classList.contains('pdsearch') ) ||  event.target.closest('.pdsearch-wrapper') ){

			}else{
				document.querySelectorAll('.pdsearch-wrapper').forEach(function(el){
					el.querySelector('.pdsearch-sub').classList.remove('active');
				});
			}

		});

		document.addEventListener('touchstart',function(){
			
			if( ( event.target.classList.contains('pdsearch-wrapper') || event.target.classList.contains('pdsearch') ) ||  event.target.closest('.pdsearch-wrapper') ){

			}else{
				document.querySelectorAll('.pdsearch-wrapper').forEach(function(el){
					el.querySelector('.pdsearch-sub').classList.remove('active');
				});
			}

		});

	},
	saveRecentsearches(k,activeEl){
		const _self = this;
		// -- save keyword to recent searches
    	const recentsearchesdb = new PouchDB('recentsearches');

    	recentsearchesdb.allDocs({
    		include_docs : true
    	}).then(function(docs){
    		if( docs.total_rows == 0 ){
    			if( activeEl.querySelector('.recentText') ){
    				activeEl.querySelector('.recentText').style.display = 'none';	
    			}
    			
    		}
    		if( docs.total_rows > 10 ){
    			recentsearchesdb.get(docs.rows[docs.rows.length-1].id).then(function(doc){
    				return recentsearchesdb.remove(doc).then(function(){
    					recentsearchesdb.get(k).catch(function(){
    						recentsearchesdb.put({
        						_id : k,
        						keyword : k
        					}).then(function(){

        						recentsearchesdb.allDocs({
        							include_docs : true
        						}).then(function(docs){
        							if( activeEl.querySelector('.recentText') ){
        								_self.emptydiv(document.querySelector(elid).querySelector('.pdsearch-recentsearches'));
        								if( docs.total_rows > 0 ){
		        							activeEl.querySelector('.recentText').style.display = 'block';
		        						}
        							}
        							docs.rows.forEach(function(el){
        								let newel = document.createElement('span');
        									newel.classList.add('recent-item');
        									newel.textContent = el.doc.keyword;
        									newel.addEventListener('click',function(){
        										let elid = this.closest('.pdsearch-wrapper').getAttribute('id');
        										activeEl.querySelector('.pdsearch').value = this.textContent;

        										_self.autosuggestion(this.textContent,elid)
        									});

        								if( activeEl.querySelector('.pdsearch-recentsearches') ){
        									activeEl.querySelector('.pdsearch-recentsearches').appendChild(newel);
        								}
        							});

        						});
        					}).catch(function(err){
        						console.log('Error saving new recent searches');
        						console.log(err);
        					});
    					});
    				}).catch(function(err){
						console.log('Error saving new recent searches');
						console.log(err);
					});;
    			}).catch(function(err){
					console.log('Error saving new recent searches');
					console.log(err);
				});;
    		}else{
    			recentsearchesdb.get(k).catch(function(){
    				recentsearchesdb.put({
						_id : k,
						keyword : k
					}).then(function(){
						recentsearchesdb.allDocs({
							include_docs : true
						}).then(function(docs){
							if( activeEl.querySelector('.recentText') ){
								_self.emptydiv(activeEl.querySelector('.pdsearch-recentsearches'));
								if( docs.total_rows > 0 ){
									activeEl.querySelector('.recentText').style.display = 'block';
								}
							}
							docs.rows.forEach(function(el){
								let newel = document.createElement('span');
									newel.classList.add('recent-item');
									newel.textContent = el.doc.keyword;
									newel.addEventListener('click',function(){
										let elid = this.closest('.pdsearch-wrapper').getAttribute('id');
										activeEl.querySelector('.pdsearch').value = this.textContent;

										_self.autosuggestion(this.textContent,elid)
									});
								if( activeEl.querySelector('.pdsearch-recentsearches') ){
									activeEl.querySelector('.pdsearch-recentsearches').appendChild(newel);
								}
							});

						}).catch(function(err){
    						console.log('Error saving new recent searches');
    						console.log(err);
    					});
					}).catch(function(err){
						console.log('Error saving new recent searches');
						console.log(err);
					});
    			});
    		};
    	});
	},
	initDB(db,el){
		const _self = this;

		let appversiondb = new PouchDB('appversion');
		let appdatedb = new PouchDB('appdate');
		let today = new Date();
		let customdb = new PouchDB(db.toString());
		let expiration = ( el.getAttribute('data-expiration') ) ? parseInt( el.getAttribute('data-expiration') ) : 1;

		// -- init custom db
		appversiondb.get(db.toString()).then(function(doc){

			let version = ( el.getAttribute('data-version') ) ? parseInt( el.getAttribute('data-version') ) : 1;

			if( version && doc.version != version ){

				customdb.destroy();

				appdatedb.get(db.toString()).then(function(doc){
					return appdatedb.put({
						_id : db.toString(),
						date : new Date(),
						expiration : expiration,
						_rev : doc._rev
					});
				}).catch(function(){
					appdatedb.put({
						_id : db.toString(),
						date : new Date(),
						expiration : expiration,
					});
				});

				return appversiondb.put({
					_id : db.toString(),
					version : version,
					_rev : doc._rev
				});

			}else{

				appdatedb.get(db.toString()).then(function(doc){
					let expiration =  ( new Date( doc.date ) ).setDate( ( new Date( doc.date ) ).getDate() + parseInt( doc.expiration ) );
					if( today.getTime() >= expiration ){
						customdb.destroy();

						appdatedb.get(db.toString()).then(function(doc){
							return appdatedb.put({
								_id : db.toString(),
								date : new Date(),
								expiration : expiration,
								_rev : doc._rev
							});
						}).catch(function(){
							appdatedb.put({
								_id : db.toString(),
								date : new Date(),
								expiration : expiration,
							});
						});

						appversiondb.get(db.toString()).then(function(doc){
							return appversiondb.put({
								_id : db.toString(),
								version : ( version  ) ? version : 1,
								_rev : doc._rev
							});
						}).catch(function(){
							appversiondb.put({
								_id : db.toString(),
								version : ( version  ) ? version : 1,
								_rev : doc._rev
							});
						});
					}
				}).catch(function(){
					appdatedb.put({
						_id : db.toString(),
						date : new Date(),
						expiration : expiration,
					});
				});


			}
		}).catch(function(){
			let version = ( el.getAttribute('data-version') ) ? parseInt( el.getAttribute('data-version') ) : 1;

			customdb.destroy();
			// set up appdb
			appversiondb.get(db.toString()).catch(function(){
				appversiondb.put({
					_id : db.toString(),
					version : ( version  ) ? version : 1
				});
			});

			appdatedb.get(db.toString()).catch(function(){
				appdatedb.put({
					_id : db.toString(),
					date : new Date(),
					expiration : expiration,
				});
			});
		});
	},
	initAppDB(){
		const _self = this;

		let appversiondb = new PouchDB('appversion');
		let appdatedb = new PouchDB('appdate');
		let spellcheckerdb = new PouchDB('spellchecker');
		let autosuggestiondb = new PouchDB('autosuggestion');
		let recentsearchesdb = new PouchDB('recentsearches');
		let today = new Date();

		// -- init spellchecker
		appversiondb.get('spellchecker').then(function(doc){

			let version = ( window.hasOwnProperty('appSpellcheckerVersion') ) ? appSpellcheckerVersion : false;

			if( version && doc.version != version ){

				spellcheckerdb.destroy().then(function(){
					_self.downloadDict();
				});

				appdatedb.get('spellchecker').then(function(doc){
					return appdatedb.put({
						_id : 'spellchecker',
						date : new Date(),
						expiration : 5,
						_rev : doc._rev
					});
				}).catch(function(){
					appdatedb.put({
						_id : 'spellchecker',
						date : new Date(),
						expiration : 5,
					});
				});

				return appversiondb.put({
					_id : 'spellchecker',
					version : version,
					_rev : doc._rev
				});

			}else{

				appdatedb.get('spellchecker').then(function(doc){
					let expiration =  ( new Date( doc.date ) ).setDate( ( new Date( doc.date ) ).getDate() + parseInt( doc.expiration ) );
					if( today.getTime() >= expiration ){
						spellcheckerdb.destroy().then(function(){
							_self.downloadDict();
						});

						appdatedb.get('spellchecker').then(function(doc){
							return appdatedb.put({
								_id : 'spellchecker',
								date : new Date(),
								expiration : 5,
								_rev : doc._rev
							});
						}).catch(function(){
							appdatedb.put({
								_id : 'spellchecker',
								date : new Date(),
								expiration : 5,
							});
						});

						appversiondb.get('spellchecker').then(function(doc){
							return appversiondb.put({
								_id : 'spellchecker',
								version : ( version  ) ? version : 1,
								_rev : doc._rev
							});
						}).catch(function(){
							appversiondb.put({
								_id : 'spellchecker',
								version : ( version  ) ? version : 1,
								_rev : doc._rev
							});
						});
					}
				}).catch(function(){
					appdatedb.put({
						_id : 'spellchecker',
						date : new Date(),
						expiration : 5,
					});
				});


			}
		}).catch(function(){
			let version = ( window.hasOwnProperty('appSpellcheckerVersion') ) ? appSpellcheckerVersion : false;

			spellcheckerdb.destroy().then(function(){
				_self.downloadDict()
			});
			// set up appdb
			appversiondb.get('spellchecker').catch(function(){
				appversiondb.put({
					_id : 'spellchecker',
					version : ( version  ) ? version : 1
				});
			});

			appdatedb.get('spellchecker').catch(function(){
				appdatedb.put({
					_id : 'spellchecker',
					date : new Date(),
					expiration : 5,
				});
			});
		});

		// -- init autosuggestion
		appversiondb.get('autosuggestion').then(function(doc){
			let version = ( window.hasOwnProperty('appAutoVersion') ) ? appAutoVersion : false;

			if( version && doc.version != version ){

				autosuggestiondb.destroy().then(function(){
					_self.downloadDict()
				});

				appdatedb.get('autosuggestion').then(function(doc){
					return appdatedb.put({
						_id : 'autosuggestion',
						date : new Date(),
						expiration : 5,
						_rev : doc._rev
					});
				}).catch(function(){
					appdatedb.put({
						_id : 'autosuggestion',
						date : new Date(),
						expiration : 5,
					});
				});

				return appversiondb.put({
					_id : 'autosuggestion',
					version : version,
					_rev : doc._rev
				});

			}else{

				appdatedb.get('autosuggestion').then(function(doc){
					let expiration =  ( new Date( doc.date ) ).setDate( ( new Date( doc.date ) ).getDate() + parseInt( doc.expiration ) );
					if( today.getTime() >= expiration ){
						autosuggestiondb.destroy().then(function(){
							_self.downloadDict();
						});

						appdatedb.get('autosuggestion').then(function(doc){
							return appdatedb.put({
								_id : 'autosuggestion',
								date : new Date(),
								expiration : 5,
								_rev : doc._rev
							});
						}).catch(function(){
							appdatedb.put({
								_id : 'autosuggestion',
								date : new Date(),
								expiration : 5,
							});
						});

						appversiondb.get('autosuggestion').then(function(doc){
							return appversiondb.put({
								_id : 'autosuggestion',
								version : ( version  ) ? version : 1,
								_rev : doc._rev
							});
						}).catch(function(){
							appversiondb.put({
								_id : 'autosuggestion',
								version : ( version  ) ? version : 1,
								_rev : doc._rev
							});
						});
					}
				}).catch(function(){
					appdatedb.put({
						_id : 'autosuggestion',
						date : new Date(),
						expiration : 5,
					});
				});


			}
		}).catch(function(){
			let version = ( window.hasOwnProperty('appAutoVersion') ) ? appAutoVersion : false;

			autosuggestiondb.destroy();
			// set up appdb
			appversiondb.get('autosuggestion').catch(function(){
				appversiondb.put({
					_id : 'autosuggestion',
					version : ( version  ) ? version : 1
				});
			});

			appdatedb.get('autosuggestion').catch(function(){
				appdatedb.put({
					_id : 'autosuggestion',
					date : new Date(),
					expiration : 5,
				});
			});
		});

		// -- init recentsearches
		appversiondb.get('recentsearches').then(function(doc){
			let version = ( window.hasOwnProperty('appRecentVersion') ) ? appRecentVersion : false;

			if( version && doc.version != version ){

				recentsearchesdb.destroy().then(function(){
					_self.downloadDict()
				});

				appdatedb.get('recentsearches').then(function(doc){
					return appdatedb.put({
						_id : 'recentsearches',
						date : new Date(),
						expiration : 5,
						_rev : doc._rev
					});
				}).catch(function(){
					appdatedb.put({
						_id : 'recentsearches',
						date : new Date(),
						expiration : 5,
					});
				});

				return appversiondb.put({
					_id : 'recentsearches',
					version : version,
					_rev : doc._rev
				});

			}else{

				appdatedb.get('recentsearches').then(function(doc){
					let expiration =  ( new Date( doc.date ) ).setDate( ( new Date( doc.date ) ).getDate() + parseInt( doc.expiration ) );
					if( today.getTime() >= expiration ){
						recentsearchesdb.destroy().then(function(){
							_self.downloadDict();
						});

						appdatedb.get('recentsearches').then(function(doc){
							return appdatedb.put({
								_id : 'recentsearches',
								date : new Date(),
								expiration : 5,
								_rev : doc._rev
							});
						}).catch(function(){
							appdatedb.put({
								_id : 'recentsearches',
								date : new Date(),
								expiration : 5,
							});
						});

						appversiondb.get('recentsearches').then(function(doc){
							return appversiondb.put({
								_id : 'recentsearches',
								version : ( version  ) ? version : 1,
								_rev : doc._rev
							});
						}).catch(function(){
							appversiondb.put({
								_id : 'recentsearches',
								version : ( version  ) ? version : 1,
								_rev : doc._rev
							});
						});
					}
				}).catch(function(){
					appdatedb.put({
						_id : 'recentsearches',
						date : new Date(),
						expiration : 5,
					});
				});


			}
		}).catch(function(){
			let version = ( window.hasOwnProperty('appRecentVersion') ) ? appRecentVersion : false;

			recentsearchesdb.destroy();
			// set up appdb
			appversiondb.get('recentsearches').catch(function(){
				appversiondb.put({
					_id : 'recentsearches',
					version : ( version  ) ? version : 1
				});
			});

			appdatedb.get('recentsearches').catch(function(){
				appdatedb.put({
					_id : 'recentsearches',
					date : new Date(),
					expiration : 5,
				});
			});
		});

	},
	computeMarker(el){
		if( el.value != '' ){
			let raw = el.value.split(' ');
			let word = ( raw.length == 1 ) ? raw[0] : raw[raw.length - 1];

			el.setAttribute('data-marker',el.value.indexOf(word) * 6 );

		}else{
			el.setAttribute('data-marker', 0);
		}		
	},
	emptydiv(c){
        if( c == null ){
            return;
        }

        while (c.firstChild) {
            c.removeChild(c.firstChild);
        }
    },
    orderResult(data,elid){ 


    	let activeEl = document.querySelector(elid);
    	let keyword = activeEl.querySelector('.pdsearch').value;
    	let orderby = ( document.querySelector( activeEl.querySelector('.pdsearch').getAttribute('data-template') ).getAttribute('data-orderkey') ) ? document.querySelector( activeEl.querySelector('.pdsearch').getAttribute('data-template') ).getAttribute('data-orderkey') : false;

    	if( !orderby ){
    		orderby = document.querySelector( activeEl.querySelector('.pdsearch').getAttribute('data-template') ).getAttribute('data-keys').split(',')[0].trim();
    	}


	    if( data.length == 0 || data == undefined ){
	        return [];
	    }

	    let new_data = data.sort(function(a,b){

	    	return ( ( a[orderby].toLowerCase().indexOf( keyword.toLowerCase() ) != -1 ) ? a[orderby].toLowerCase().indexOf( keyword.toLowerCase() ) : 0 ) - ( ( b[orderby].toLowerCase().indexOf( keyword.toLowerCase() ) != -1 ) ? b[orderby].toLowerCase().indexOf( keyword.toLowerCase() ) : 0 );
	        
	    });


	    let new_arr2 = [];
	    let new_arr3 = [];

	    new_data.forEach(function(el){

	        let obj = el[orderby];

	        if( obj.toLowerCase().indexOf( keyword.toLowerCase() ) == -1 ){
	            new_arr2.push(el);
	        }else{
	            new_arr3.push(el);
	        }

	    });

	    let new_arr4 = [];


	    new_arr3.forEach(function(value){
	        new_arr4.push(value);
	    });

	    new_arr2.forEach(function(value){
	        new_arr4.push(value);
	    });

	    return new_arr4;
	},
	autosuggestion(k,elid,customdb){

		const _self = this;

		const autosuggestiondb = ( customdb ) ? new PouchDB(customdb.toString()) : new PouchDB('autosuggestion');
		let activeEl = document.querySelector(elid);
		let url = activeEl.querySelector('.pdsearch').getAttribute('data-url')+'&keyword='+encodeURIComponent(activeEl.querySelector('.pdsearch').value);

		activeEl.querySelector('.btn-clear').style.display = 'none';
		activeEl.querySelector('.search-spinner-wrapper').style.display = 'block';
		if( activeEl.querySelector('.spellbox') ){
			activeEl.querySelector('.spellbox').style.display = 'none';
		}

		// empty result divs first
		this.emptydiv(activeEl.querySelector('.results-div'));

		let allowedStorage = false;

		if( activeEl.querySelector('.pdsearch').getAttribute('data-storage') ){
			if( activeEl.querySelector('.pdsearch').getAttribute('data-storage').toLowerCase() == 'true' ){
				allowedStorage = true;
			}else{
				allowedStorage = false
			}
		}else{
			allowedStorage = true;
		}


		if( allowedStorage ){			
		
			autosuggestiondb.allDocs({
				include_docs : true
			}).then(function(docs){


				if( docs.total_rows > 0 ){

					autosuggestiondb.get(k).then(function(doc){
						let results = doc.data;

						if( activeEl && activeEl.querySelector('.pdsearch').getAttribute('data-modify-results') && window[activeEl.querySelector('.pdsearch').getAttribute('data-modify-results')] ){
							results = window[activeEl.querySelector('.pdsearch').getAttribute('data-modify-results')](results);
						}

						let data = _self.orderResult(results,elid);

						data.forEach(function(el){
							activeEl.querySelector('.btn-clear').style.display = 'block';
			        		activeEl.querySelector('.search-spinner-wrapper').style.display = 'none';

							if( activeEl.querySelector('.pdsearch').getAttribute('data-template') ){

								if( !document.querySelector( activeEl.querySelector('.pdsearch').getAttribute('data-template') ).getAttribute('data-keys') ){
									console.log('template data-keys must be define');
									return
								}
								let objs = document.querySelector( activeEl.querySelector('.pdsearch').getAttribute('data-template') ).getAttribute('data-keys').split(',');
								let temp = document.querySelector( activeEl.querySelector('.pdsearch').getAttribute('data-template') ).innerHTML;
								let clickEvent = document.querySelector( activeEl.querySelector('.pdsearch').getAttribute('data-template') ).getAttribute('data-click');

								let objsNew = [];
								let dbitem = {};

								// sanitize all keys first
								objs.forEach(function(obj){
									objsNew.push( obj.trim() );
								});

								objsNew.forEach(function(obj){
									if( el[obj] ){
										let text = el[obj].toLowerCase().replace(new RegExp('(' + activeEl.querySelector('.pdsearch').value.toLowerCase() + ')', "g"), '<span class="match-word item-match">$1</span>');
										
										temp = temp.replace('$'+obj,text);
									}
								});


								let newel = document.createElement('div');
									newel.classList.add('item','item-wrapper');
									newel.addEventListener('click',function(){
										window[clickEvent](this,el);
									});
									newel.innerHTML = temp;

								activeEl.querySelector('.results-div').appendChild(newel);

								activeEl.querySelector('.pdsearch-sub').classList.add('active');


				        	}else{
								console.log('Result template is not define');
				        	}
						});
					}).catch(function(){
						
						_self.downloadAutosServer(k,elid,customdb)
					});


				}else{

					_self.downloadAutosServer(k,elid,customdb)

				}

			});
		}else{
			this.downloadAutosServer(k,elid,customdb)
		}

	},
	downloadAutosServer(k,elid,customdb){

		const _self = this;

		const autosuggestiondb = ( customdb ) ? new PouchDB(customdb.toString()) : new PouchDB('autosuggestion');
		let activeEl = document.querySelector(elid);
		let url = activeEl.querySelector('.pdsearch').getAttribute('data-url')+'&keyword='+encodeURIComponent(activeEl.querySelector('.pdsearch').value);

		axios.get( url )
        .then(function(res){

        	if( document.querySelector('.pdsearch.active') && document.querySelector('.pdsearch.active').classList.contains('cancelled') ){
				if( document.querySelector('.pdsearch.active').closest('.pdsearch-wrapper').querySelector('.spellbox') ){
					document.querySelector('.pdsearch.active').closest('.pdsearch-wrapper').querySelector('.spellbox').style.display = 'none';	
				}
				document.querySelector('.pdsearch.active').closest('.pdsearch-wrapper').querySelector('.pdsearch-sub').classList.remove('active');
        		return;
        	}

        	autosuggestiondb.get(k).then(function(doc){
        		activeEl.querySelector('.btn-clear').style.display = 'block';
        		activeEl.querySelector('.search-spinner-wrapper').style.display = 'none';
        		
        		if( activeEl.querySelector('.pdsearch').getAttribute('data-storage') ){
					if( activeEl.querySelector('.pdsearch').getAttribute('data-storage').toLowerCase() == 'true' ){
						allowedStorage = true;
					}else{
						allowedStorage = false
					}
				}else{
					allowedStorage = true;
				}

        		if( allowedStorage ){
        			return autosuggestiondb.put({
	        			_id : k,
	        			data : res.data,
	        			_rev : doc._rev
	        		});	
        		}
        		
        	}).catch(function(){
        		activeEl.querySelector('.btn-clear').style.display = 'block';
        		activeEl.querySelector('.search-spinner-wrapper').style.display = 'none';

        		let allowedStorage = false;

	        	if( activeEl.querySelector('.pdsearch').getAttribute('data-storage') ){
					if( activeEl.querySelector('.pdsearch').getAttribute('data-storage').toLowerCase() == 'true' ){
						allowedStorage = true;
					}else{
						allowedStorage = false
					}
				}else{
					allowedStorage = true;
				}

        		if( allowedStorage ){
	        		autosuggestiondb.put({
	        			_id : k,
	        			data : res.data
	        		});
	        	}
        	});

        	// -- end

        	let results = res.data;

			if( activeEl && activeEl.querySelector('.pdsearch').getAttribute('data-modify-results') && window[activeEl.querySelector('.pdsearch').getAttribute('data-modify-results')] ){
				results = window[activeEl.querySelector('.pdsearch').getAttribute('data-modify-results')](results);
			}

            let data = _self.orderResult(results,elid);

			data.forEach(function(el,i){
	        	if( activeEl.querySelector('.pdsearch').getAttribute('data-template') && document.querySelector(activeEl.querySelector('.pdsearch').getAttribute('data-template')) ){
					let objs = document.querySelector( activeEl.querySelector('.pdsearch').getAttribute('data-template') ).getAttribute('data-keys').split(',');
					let temp = document.querySelector( activeEl.querySelector('.pdsearch').getAttribute('data-template') ).innerHTML;
					let clickEvent = document.querySelector( activeEl.querySelector('.pdsearch').getAttribute('data-template') ).getAttribute('data-click');

					let objsNew = [];
					let dbitem = {};

					// sanitize all keys first
					objs.forEach(function(obj){
						objsNew.push( obj.trim() );
					});

					objsNew.forEach(function(obj){
						if( el[obj] ){
							let text = el[obj].toLowerCase().replace(new RegExp('(' + activeEl.querySelector('.pdsearch').value.toLowerCase() + ')', "g"), '<span class="match-word item-match">$1</span>');
							
							temp = temp.replace('$'+obj,text);
						}
					});

					let newel = document.createElement('div');
						newel.classList.add('item','item-wrapper');
						newel.addEventListener('click',function(){
							window[clickEvent](this,el);
						});
						newel.innerHTML = temp;

					activeEl.querySelector('.results-div').appendChild(newel);

					activeEl.querySelector('.pdsearch-sub').classList.add('active');

	        	}else{

					console.log('Result template is not define');

	        	}


            });
        }).catch(function(err){
            console.log(err);
        });
	},
	downloadDict(){

		let spelldb = new PouchDB('spellchecker');

		spelldb.destroy().then(function(){
			axios.get('https://cnapi.connectnigeria.com/api/v2/db/table?api_token=H3rUbN0crD0aMcDYwwtNGNN7bai6z6w7&db_name=cn_api&table_name=spellchecker')
	        .then(function(res){

	        	let spelldb = new PouchDB('spellchecker');

	            res.data.data.forEach(function(el,i){
	                spelldb.get(i.toString()).then(function(doc){
	                	return spelldb.put({
		                    _id : i.toString(),
		                    word : el.word,
		                    _rev : doc._rev
		                });
	                }).catch(function(){
	                	spelldb.put({
		                    _id : i.toString(),
		                    word : el.word
		                });
	                });
	                
	            });
	            
	        }).catch(function(err){
	            console.log(err);
	        });
		});
	},
	searchSpell(k,elid){
		let activeEl = document.querySelector(elid);
		let allowedSpellchecker = false;

		if( activeEl.querySelector('.pdsearch').getAttribute('data-spellchecker') ){
			if( activeEl.querySelector('.pdsearch').getAttribute('data-spellchecker').toLowerCase() == 'true' ){
				allowedSpellchecker = true;
			}else{
				allowedSpellchecker = false
			}
		}else{
			allowedSpellchecker = true;
		}

		if( allowedSpellchecker ){
			
			clearTimeout(timer);
		
			const fuseoptions =  {
	            shouldSort: true,
	        	tokenize: true,
	        	matchAllTokens: true,
	        	includeScore: true,
	        	threshold: 0.1,
	        	location: 0,
	        	distance: 50,
	        	maxPatternLength: 32,
	        	minMatchCharLength: 1,
	        	keys: [
	            	"doc.word",
	          	]
	        };

	        if( document.querySelector(elid).querySelector('.spellbox') ){
		        document.querySelector(elid).querySelector('.spellbox').style.display = 'none';
		    }
	        if( k.trim() == '' ){
				return;
			}

	        let db = new PouchDB('spellchecker');        

	        db.allDocs({
	        	include_docs : true
	        }).then(function(docs){

	        	const fuse = new Fuse(docs.rows, fuseoptions);

	        	let raw = k.split(' ');
	        	let word = ( raw.length == 1 ) ? raw[0] : raw[raw.length-1];

	        	let res = fuse.search(word);

	        	if( res.length > 0 && res[0].item.doc.word != document.querySelector(elid).querySelector('.pdsearch').value ){

	        		let spellbox = document.querySelector(elid).querySelector('.spellbox');
	        		spellbox.textContent = res[0].item.doc.word;
	        		
	        		spellbox.style.left = parseInt( document.querySelector(elid).querySelector('.pdsearch').getAttribute('data-marker') )+'px';
	        		
	        		spellbox.style.display = 'block';

	        		timer = setTimeout(function(){
	        			spellbox.style.display = 'none';
	        		},5000);
	        	}

	        }).catch(function(err){
	        	console.log(err);
	        });			
		}
		
	},
}

pdsearch.init();