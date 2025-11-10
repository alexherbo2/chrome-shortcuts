# General options
name = chrome-shortcuts
version = $(shell git describe --tags --always)

all: node_modules assets/shortcuts-logo@16px.png assets/shortcuts-logo@32px.png assets/shortcuts-logo@48px.png assets/shortcuts-logo@128px.png assets/keyboard_codes_alphanumeric.svg

node_modules:
	npm install

assets/shortcuts-logo@16px.png: assets/shortcuts-logo.svg
	node scripts/export-svg-as-png.js $< $@ 16 16

assets/shortcuts-logo@32px.png: assets/shortcuts-logo.svg
	node scripts/export-svg-as-png.js $< $@ 32 32

assets/shortcuts-logo@48px.png: assets/shortcuts-logo.svg
	node scripts/export-svg-as-png.js $< $@ 48 48

assets/shortcuts-logo@128px.png: assets/shortcuts-logo.svg
	node scripts/export-svg-as-png.js $< $@ 128 128

assets/keyboard_codes_alphanumeric.svg:
	curl -sSL -z $@ --create-dirs -o $@ https://w3c.github.io/uievents-code/images/keyboard-codes-alphanum1.svg

chrome-web-store-assets: extra/chrome-web-store/assets/shortcuts-screenshot-01.png extra/chrome-web-store/assets/shortcuts-screenshot-02.png extra/chrome-web-store/assets/shortcuts-screenshot-03.png extra/chrome-web-store/assets/shortcuts-small-promo-tile.png extra/chrome-web-store/assets/shortcuts-marquee-promo-tile.png extra/chrome-web-store/assets/shortcuts-screenshot-01.fr.png extra/chrome-web-store/assets/shortcuts-screenshot-02.fr.png extra/chrome-web-store/assets/shortcuts-screenshot-03.fr.png

extra/chrome-web-store/assets/shortcuts-screenshot-01.png: extra/chrome-web-store/assets/shortcuts-screenshot-01.svg
	node scripts/export-svg-as-png.js $< $@ 1280 800

extra/chrome-web-store/assets/shortcuts-screenshot-02.png: extra/chrome-web-store/assets/shortcuts-screenshot-02.svg
	node scripts/export-svg-as-png.js $< $@ 1280 800

extra/chrome-web-store/assets/shortcuts-screenshot-03.png: extra/chrome-web-store/assets/shortcuts-screenshot-03.svg
	node scripts/export-svg-as-png.js $< $@ 1280 800

extra/chrome-web-store/assets/shortcuts-small-promo-tile.png: extra/chrome-web-store/assets/shortcuts-small-promo-tile.svg
	node scripts/export-svg-as-png.js $< $@ 440 280

extra/chrome-web-store/assets/shortcuts-marquee-promo-tile.png: extra/chrome-web-store/assets/shortcuts-marquee-promo-tile.svg
	node scripts/export-svg-as-png.js $< $@ 1400 560

extra/chrome-web-store/assets/shortcuts-screenshot-01.fr.png: extra/chrome-web-store/assets/shortcuts-screenshot-01.fr.svg
	node scripts/export-svg-as-png.js $< $@ 1280 800

extra/chrome-web-store/assets/shortcuts-screenshot-02.fr.png: extra/chrome-web-store/assets/shortcuts-screenshot-02.fr.svg
	node scripts/export-svg-as-png.js $< $@ 1280 800

extra/chrome-web-store/assets/shortcuts-screenshot-03.fr.png: extra/chrome-web-store/assets/shortcuts-screenshot-03.fr.svg
	node scripts/export-svg-as-png.js $< $@ 1280 800

build: all
	npm install

release: clean build
	7z a releases/$(name)-$(version).zip manifest.json src assets _locales

clean:
	git clean -d -f -X
