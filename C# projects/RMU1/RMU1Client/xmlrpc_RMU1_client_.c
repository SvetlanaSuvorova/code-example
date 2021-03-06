/* XML-RPC client to run scanning RMU1 device */

#include <stdlib.h>
#include <stdio.h>

#include <xmlrpc-c/base.h>
#include <xmlrpc-c/client.h>

#include <xmlrpc-c/config.h>  /* information about this build environment */

#define NAME "Xmlrpc-c RMU1 Client"
#define VERSION "1.0"

/* 
*	Write in the log file if an error occures 
*/
static void  
dieIfFaultOccurred (xmlrpc_env * const envP, const char * const logFileNameP) {
	if (envP->fault_occurred) {
 		FILE *pFile;
		pFile=fopen(logFileNameP, "w");
		if (pFile == NULL) {
		    fprintf(stderr, "Error opening file!\n");
			return ;
		}
		fprintf(pFile, "ERROR: %s (%d)\n",
                envP->fault_string, envP->fault_code);
		fclose (pFile);
		return ;
    }
	return ;
}

/* 
*	Init RMU1 device on server to run scanning.
*/
__declspec(dllexport) int init_device (
//int main(int const param1,
    const char * serverUrlP, // server URL 
	int const framesNumberP,  // количество кадров
    int const volltageSourceP, // напряжение
    double const currentSourceP, // сила тока
    int const expositionTimeFrameP, // время экспозиции кадра
    int const targetTimeFrameP, // время позиционирования
	int const overlapZoneP, // зона перекрытия кадров
	int const reverseP,
    const char * dataFileNameP // название временных файлов
) {

    xmlrpc_env env;
    xmlrpc_value * result;
    const char * const methodName = "RMU1ScanInit.set";
	const char * const logFileName = "log/rmu1_rpc_log";

    xmlrpc_env_init(&env);

	//	Initialize our error-handling environment. 
    //	Start up our XML-RPC client library. 
    dieIfFaultOccurred(&env, logFileName);

	if (!env.fault_occurred) { 
		xmlrpc_client_init2(&env, XMLRPC_CLIENT_NO_FLAGS, NAME, VERSION, NULL, 0);
		dieIfFaultOccurred(&env, logFileName);
	}

	if (!env.fault_occurred) {
		result = xmlrpc_client_call(&env, serverUrlP, methodName, "(iidiiiis)", 
			(xmlrpc_int32) framesNumberP,
			(xmlrpc_int32) volltageSourceP,
			(xmlrpc_double) currentSourceP, 
			(xmlrpc_int32) expositionTimeFrameP, 
			(xmlrpc_int32) targetTimeFrameP, 
			(xmlrpc_int32) overlapZoneP,
			(xmlrpc_int32) reverseP,
			dataFileNameP
		);
		dieIfFaultOccurred(&env, logFileName);
	}

	if (!env.fault_occurred) { 
		// Dispose of our result value. 
		xmlrpc_DECREF(result);
	}
    
	// Clean up our error-handling environment. 
    xmlrpc_env_clean(&env);
    
    // Shutdown our XML-RPC client library. 
    xmlrpc_client_cleanup();

	if (!env.fault_occurred) { 
		return 0;
	} 
	else {
		return 1;
	}
}

/* 
*	Stop RMU1 device.
*/
__declspec(dllexport) int stop_device(
    const char * serverUrlP // server URL 
) {

    xmlrpc_env env;
    xmlrpc_value * result;
    const char * const methodName = "RMU1ScanStop.set";
	const char * const logFileName = "../log/rmu1_rpc_log";
	result = 0;
    xmlrpc_env_init(&env);

	//	Initialize our error-handling environment. 
    //	Start up our XML-RPC client library. 
    dieIfFaultOccurred(&env, logFileName);
	if (!env.fault_occurred) {
		result = xmlrpc_client_call(&env, serverUrlP, methodName, "(i)", (xmlrpc_int32) 0);
		dieIfFaultOccurred(&env, logFileName);
	}
	return 0;
}

/* 
*	Check connection to RMU1 device.
*/
__declspec(dllexport) int connection_device(
    const char * serverUrlP // server URL 
) {

    xmlrpc_env env;
    xmlrpc_value * result;
    const char * const methodName = "RMU1Connection.set";
	const char * const logFileName = "../log/rmu1_rpc_log";
	int connectP;
	result = 1;
	connectP = -1;

	    xmlrpc_env_init(&env);

	//	Initialize our error-handling environment. 
    //	Start up our XML-RPC client library. 
    dieIfFaultOccurred(&env, logFileName);
	if (!env.fault_occurred) { 
		xmlrpc_client_init2(&env, XMLRPC_CLIENT_NO_FLAGS, NAME, VERSION, NULL, 0);
		dieIfFaultOccurred(&env, logFileName);
	}

	if (!env.fault_occurred) {
		result = xmlrpc_client_call(&env, serverUrlP, methodName, "()", 0);
		dieIfFaultOccurred(&env, logFileName);
	}
	    /* Get our sum and print it out. */

    xmlrpc_read_int(&env, result, &connectP);

    dieIfFaultOccurred(&env, logFileName);

 //   printf("The sum is %d\n", sum);

	if (!env.fault_occurred) { 
		// Dispose of our result value. 
		xmlrpc_DECREF(result);
	}
    
	// Clean up our error-handling environment. 
    xmlrpc_env_clean(&env);
    
    // Shutdown our XML-RPC client library. 
    xmlrpc_client_cleanup();

	return connectP + 1;
/*	if (!env.fault_occurred) { 
		return 0;
	} 
	else {
		return 1;
	}
	*/
}