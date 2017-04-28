function sayMyName(x, y) {
	console.log( this );
}

window.location

document.addEventListener("DOMContentLoaded", function() {
	var slides = document.querySelectorAll( '.my-code' );

	if ( 0 == slides.length )
		return;

	slides.forEach( function( slide ) {
		var codes = slide.querySelectorAll( 'code' );

		if ( 0 == codes.length ) 
			return;

		codes.forEach( function( code ) {
			code.innerHTML = replaceCode( code.innerHTML, code.innerText );

		})
	})

});

function replaceCode( html, text ) {
	var regExps = {
		equal:       [ 'orange', /=/ig ],
		comment:     [ 'gray',   /\/\/.*/ig ],
		plus:        [ 'orange', /\+/ig ],
		singleQuote: [ 'green',  /\'([^\'])*'/ig ],
		doubleQuote: [ 'green',  /\"([^\'])*"/ig ],
		funcName:    [ 'brown',  /(function\s+|\.)([^\(|,|\s])*/ig ],
		var:         [ 'blue',   /var\s+([^\=])+/ig ],
		sharp:       [ 'red',    /\#(\w|[0-9])+/ig ],
		number:      [ 'red',    /[0-9]+/ig ],
		// in: [ 'orange', /\sin\s/ig ],
	}

	// if ( text.match(  regExps.sharp[1]) ) {
	// 	console.log(text)
	// 	console.log(text.match(  regExps.sharp[1]))
		
	// }


	for ( name in regExps ) {
		var matches = text.match( regExps[ name ][1] )

		if ( !matches ) 
			continue;

		matches.forEach( function( match ) {
			html = replace( html, match, regExps[ name ][0] );
		})
	}

	var colors = {
		'function' :  'yellow',
		'return':     'orange',
		'if':         'orange',
		'else':       'orange',
		'var' :       'yellow',
		'for' :       'orange',
		'each' :      'orange',
		'contniue' :  'orange',
		'!' :         'orange',
		'console':    'brown',
		'.log':       'yellow',
		'setTimeout': 'yellow',
		'document':   'pink',
		'window':     'pink',
		'this':       'blue',
		'null':       'red',
		'true':       'red',
		'false':      'red',
	}

	for ( struct in colors ) {
		html = replace( html, struct, colors[ struct ] );
	}

	return html;
}

function replace( text, struct, color ) {
	return text.replace( struct, '<span class="'+ color +'">'+ struct + '</span>' );
}
