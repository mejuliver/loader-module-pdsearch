<?php


	namespace PDLoader;


	class Pdsearch extends Loader{

		public function init($url=false){

			$assets = [];

			// append css
			if( !$url ){
				if( $this->config() && isset($this->config()['url'] ) ){
					$url = $this->config()['url'];
				}else{
					$url = $this->url();
				}
			}
			foreach (glob(__DIR__.'/dist/*') as $c) {
				$f = explode('.',$c);
				$raw = str_replace(__DIR__,$url.'loader/modules/Pdsearch',$c);
				if( $f[count($f)-1] == 'css' ){
				   $assets[] = [ 'type' => 'css', 'src' => $raw ];
				}
			}

			// append js
			foreach (glob(__DIR__.'/dist/*') as $c) {
				$f = explode('.',$c);
				$raw = str_replace(__DIR__,$url.'loader/modules/Pdsearch',$c);
				if( $f[count($f)-1] == 'js' ){
				    $assets[] = [ 'type' => 'js', 'src' => $raw ];
				}
			}

			echo "<script async defer>var pdsearchassets = ".json_encode($assets).";".trim(preg_replace('/\s+/', ' ',file_get_contents(__DIR__.'/loader.js')))."</script>\n";


		}

		public function onBuild(){
			if( file_exists(__DIR__.'/package.json') ){
				unlink(__DIR__.'/package.json');
			}
			if( file_exists(__DIR__.'/package-lock.json') ){
				unlink(__DIR__.'/package-lock.json');
			}
			if( file_exists(__DIR__.'/dist/index.html') ){
				unlink(__DIR__.'/dist/index.html');
			}
			if( file_exists(__DIR__.'/index.html') ){
				unlink(__DIR__.'/index.html');
			}
			if( file_exists(__DIR__.'/.gitignore') ){
				unlink(__DIR__.'/.gitignore');
			}
			if( file_exists(__DIR__.'/src') ){
				$this->deleteFolder(__DIR__.'/src');
			}
			if( file_exists(__DIR__.'/.phpintel') ){
				$this->deleteFolder(__DIR__.'/.phpintel');
			}
			if( file_exists(__DIR__.'/.cache') ){
				$this->deleteFolder(__DIR__.'/.cache');
			}
			if( file_exists(__DIR__.'/.git') ){
				$this->deleteFolder(__DIR__.'/.git');
			}

		}
		private function deleteFolder($dir){
			if(file_exists($dir)){
				$it = new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS);
				$files = new \RecursiveIteratorIterator($it,
				             \RecursiveIteratorIterator::CHILD_FIRST);

				foreach($files as $file) {
					chmod($file->getRealPath(),0755);
				    if ($file->isDir()){
				        rmdir($file->getRealPath());
				    } else {
				        unlink($file->getRealPath());
				    }
				}
				rmdir($dir);
			}
			
		}	

	}