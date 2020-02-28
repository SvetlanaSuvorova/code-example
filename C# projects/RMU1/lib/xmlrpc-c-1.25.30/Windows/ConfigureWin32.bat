@REM Windows build
@REM This must be RUN once to establish some header files,
@REM that are generated by the automake process
@echo creating Win32 header files...once only
@set TEMPV=
@if EXIST ..\include\xmlrpc-c\config.h goto DN1
copy .\win32_config.h ..\include\xmlrpc-c\config.h > nul
@set TEMPV=%TEMPV% ..\include\xmlrpc-c\config.h
:DN1
@if EXIST ..\xmlrpc_config.h goto DN2
copy .\xmlrpc_win32_config.h ..\xmlrpc_config.h > nul
@set TEMPV=%TEMPV% ..\xmlrpc_config.h
:DN2
@if EXIST ..\transport_config.h goto DN3
copy .\transport_config_win32.h ..\transport_config.h > nul
@set TEMPV=%TEMPV% ..\transport_config.h
:DN3
@if EXIST ..\version.h goto DN4
call mkvers
@set TEMPV=%TEMPV% ..\version.h
:DN4
@if EXIST ..\examples\config.h goto DN5
copy .\xmlrpc_win32_config.h ..\examples\config.h > nul
@set TEMPV=%TEMPV% ..\examples\config.h
:DN5
@if "%TEMPV%." == "." goto ALLDN
@echo Generated the following win32 header files ...
@echo %TEMPV%
@goto END

:ALLDN
@echo Using previous copies ... Use CleanWin32.bat to remove, and do again ...
@goto END

:END
