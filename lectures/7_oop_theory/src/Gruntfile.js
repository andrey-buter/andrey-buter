module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		// Maybe move to package.json
		include_files: {
			js: {
				libs: [
					'bower_components/prism/prism.js',
					'bower_components/prism/components/prism-javascript.js',
					'bower_components/prism/plugins/line-numbers/prism-line-numbers.js',
				],
				es2015: [
					'js/meta/jquery-open.js',

					// preload
					// 'js/pre-load.js',
					'js/functions.js',

					// onReady
					'js/meta/jquery-open-ready.js',
					'js/common.js',
					'js/meta/jquery-close-ready.js',

					// onLoad
					// 'js/meta/jquery-open-onload.js',
					// 'js/onload/common.js',
					// 'js/meta/jquery-close-onload.js',

					// load after
					// 'js/after-load.js',

					// cloase jquery
					'js/meta/jquery-close.js',
				]
			},
			jade: [
				'jade/index.jade',
			],
			scss: [
				'scss/screen.scss'
			],
		},

		pug: {
			compile: {
				options: {
					pretty: true,
					// data: {
					// 	debug: true,
					// 	timestamp: '<%= new Date().getTime() %>'
					// }
				},
				files: {
					'../index.html': 'jade/index.jade'
				}
				// files: [ 
				// 	{
				// 		cwd: "jade",
				// 		src: "**/*.jade",
				// 		dest: "../",
				// 		// expand: true,
				// 		ext: ".html"
				// 	}
				// ]
			}
		},

		sass: {
			dist: {
				options: {
					// noCache: true
				},
				files: {
					'<%= pkg.build.css %>/styles.css': '<%= include_files.scss %>',
				}
			},
		},

		postcss: {
			options: {
				map: true,
				// We need to `freeze` browsers versions for testing purposes.
				// browsers: ['last 2 versions', 'opera 12', 'ie 8', 'ie 9']
				processors: [
					require('pixrem')(),
					require('postcss-sorting')({ /* options */ }),
					// require('autoprefixer')({browsers: ['last 2 versions', 'opera 12', 'ie 8', 'ie 9']}),
				]
			},
			// prefix the specified file
			// single_file: {
			// 	src: '<%= pkg.build.css %>/styles.css',
			// 	dest: '<%= pkg.build.css %>/styles.css'
			// }
			// multiple_files: {
			// 	expand: true,
			// 	flatten: true,
			// 	src:  '<%= pkg.build.css %>/*.css',
			// 	dest: '<%= pkg.build.css %>/'
			// },
			dist: {
				src: '<%= pkg.build.css %>/styles.css'
			}
		},

		// babel: {
		// 	options: {
		// 		sourceMap: false
		// 	},
		// 	dist: {
		// 		files: [
		// 			{
		// 				expand: true,
		// 				cwd: '<%= pkg.src.js.cacheEs6 %>',
		// 				src: ['**/*.es6.js'],
		// 				// dest: '<%= pkg.build.js.main %>',
		// 				dest: '<%= pkg.src.js.cacheEs5 %>',
		// 				ext: '.js'
		// 			},
		// 		]
		// 		// files: {
		// 		// 	// "dist/app.js": "src/app.js",
		// 		// 	'<%= pkg.build.jsPages %>/testimonials.js': '<%= pkg.build.jsPages %>/testimonials.es6.js',
		// 		// }
		// 	}
		// },

		concat: {
			dist: {
				options: {
					sourceMap: false,
				},
				files: {
					'<%= pkg.src.js.cacheEs6 %>/common.es6.js': '<%= include_files.js.es2015 %>',
					'<%= pkg.src.js.cacheLibs %>/libs.js': '<%= include_files.js.libs %>',
					// '<%= pkg.buildAdmin.js %>/common.js': '<%= include_files.js_admin %>'
				}
			},
			dist_full: {
				options: {
					sourceMap: false,
				},
				src: [
					'<%= pkg.src.js.cacheLibs %>/libs.js', 
					'<%= pkg.src.js.cacheEs5 %>/common.js', 
				],
				dest: '<%= pkg.build.js.main %>/common.js',
			}
		},

		uglify: {
			my_target: {
				options: {
					mangle: false,
					sourceMap: false
				},
				files: {
					'<%= pkg.build.js.main %>/common.min.js': '<%= pkg.build.js.main %>/common.js',
					// '<%= pkg.buildAdmin.js %>/common.min.js': '<%= pkg.buildAdmin.js %>/common.js'
				}
			}
		},

		watch: {
			grunt: { files: ['Gruntfile.js'] },
			jade: {
				files: ['jade/**/*.jade'],
				tasks: ['pug'],
				options: {
					livereload: true,
				}
			},
			js: {
				files: [
					'js/**/*.js',
				],
				tasks: ['js'],
				options: {
					livereload: true,
				}
			},
			sass: {
				files: ['scss/**/*.scss'],
				tasks: ['sass-handle'],
			},
			// livereload: {
			// 	options: { 
			// 		livereload: true 
			// 	},
			// 	files: ['<%= pkg.build.cssMain %>/*.css'],
			// },
		},
	});

	require("load-grunt-tasks")(grunt);

	grunt.registerTask('sass-handle', ['sass', 'postcss'/*, 'cssmin'*/]);
	grunt.registerTask('js', ['concat:dist', /*'babel',*/ 'concat:dist_full', 'uglify']);
	grunt.registerTask('build', ['pug', 'sass-handle', 'js']);
};