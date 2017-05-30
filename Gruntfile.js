module.exports = function (grunt) {
  grunt.initConfig({
    browserify: {
      dist: {
        options: {
          transform: [
            ["babelify", {
              presets: ["es2015"],
              comments: true,
              minified: false,
              sourceType: "module"
            }]
          ]
        },
        files: {
          "dist/perfect-schema.js": ["./src/schema.js"]
        }
      },
      distMin: {
        options: {
          transform: [
            ["babelify", {
              presets: ["es2015"],
              comments: false,
              minified: true,
              sourceType: "module"
            }]
          ]
        },
        files: {
          "dist/perfect-schema.min.js": ["./src/schema.js"]
        }
      },
    },
    watch: {
      scripts: {
        files: ["./src/**/*.js"],
        tasks: ["browserify"]
      }
    }
  });

  grunt.loadNpmTasks("grunt-browserify");
  grunt.loadNpmTasks("grunt-contrib-watch");

  grunt.registerTask("default", ["watch"]);
  grunt.registerTask("build", ["browserify"]);
};
