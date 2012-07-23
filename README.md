# Self-webdriver

A nodejs shim and client-side library from driving a webdriver[1] from
the browser.

[1]: http://seleniumhq.org/projects/webdriver/

Why'd anybody want to do that?

It makes testing client-side libraries somewhat less cumbersome.
Testing logic and set-up can live client-side, calling out to the
webdriver when it needs to test a click or other hard-to-fake input.

Use-case is CodeMirror[2], which has to do some truly scary things to
properly capture input. Testing that cross-browser has been a bit of a
nightmare, this library is step one in getting automated tests off the
ground.

[2]: http://codemirror.net

The API of this library is undocumented and in flux. Its current state
is "You *might* be able to use this or take inspiration from it, but
please don't expect it to be mature or stable."
