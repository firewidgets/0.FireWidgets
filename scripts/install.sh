#!/bin/bash
if [ -z "$HOME" ]; then
	echo "ERROR: 'HOME' environment variable is not set!"
	exit 1
fi
# Source https://github.com/bash-origin/bash.origin
. "$HOME/.bash.origin"
function init {
	eval BO_SELF_BASH_SOURCE="$BO_READ_SELF_BASH_SOURCE"
	BO_deriveSelfDir ___TMP___ "$BO_SELF_BASH_SOURCE"
	local __BO_DIR__="$___TMP___"

	_OUR_BASE_DIR="$__BO_DIR__"


	function ReInstall {
		Install "reinstall"
	}

	function Install {
		BO_format "$VERBOSE" "HEADER" "Installing ..."

		# TODO: For some reason we need to activate again to ensure the correct nodejs version is selected.
	    BO_sourcePrototype "$_OUR_BASE_DIR/../../scripts/activate.sh"

		pushd "$_OUR_BASE_DIR/.." > /dev/null

			# NOTE: For some reason we need to export this again to make it available to the 'sm.expand' command.
			#       Other variables gat through. Why?
			export WORKSPACE_DIR="$WORKSPACE_DIR"

			export VERBOSE="1"
			sm.expand sm.json

		popd > /dev/null


		BO_format "$VERBOSE" "FOOTER"
	}

	Install $@
}
init $@