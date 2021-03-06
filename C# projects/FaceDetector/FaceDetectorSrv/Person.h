// Person.h : Declaration of the CPerson
#include <atldbcli.h>

#include "Settings.h"
#include "Helpers.h"

#pragma once

// code generated on Friday, August 26, 2011, 3:00 PM

class CPersonAccessor
{
private:
	wstring m_strDBLogin;
	wstring m_strDBPassword;
	wstring m_strDBHostname;
	bool m_bDBIntegrated;

public:
	LONG m_Id;
	TCHAR m_Name[51];
	TCHAR m_Fname[51];
	// ISequentialStream* m_Template;
	BYTE m_Template[8000];

	// The following wizard-generated data members contain status
	// values for the corresponding fields in the column map. You
	// can use these values to hold NULL values that the database
	// returns or to hold error information when the compiler returns
	// errors. See Field Status Data Members in Wizard-Generated
	// Accessors in the Visual C++ documentation for more information
	// on using these fields.
	// NOTE: You must initialize these fields before setting/inserting data!

	DBSTATUS m_dwIdStatus;
	DBSTATUS m_dwNameStatus;
	DBSTATUS m_dwFnameStatus;
	DBSTATUS m_dwTemplateStatus;

	// The following wizard-generated data members contain length
	// values for the corresponding fields in the column map.
	// NOTE: For variable-length columns, you must initialize these
	//       fields before setting/inserting data!

	DBLENGTH m_dwIdLength;
	DBLENGTH m_dwNameLength;
	DBLENGTH m_dwFnameLength;
	DBLENGTH m_dwTemplateLength;
	
	void GetRowsetProperties(CDBPropSet* pPropSet)
	{
		pPropSet->AddProperty(DBPROP_CANFETCHBACKWARDS, true, DBPROPOPTIONS_OPTIONAL);
		pPropSet->AddProperty(DBPROP_CANSCROLLBACKWARDS, true, DBPROPOPTIONS_OPTIONAL);
		// pPropSet->AddProperty(DBPROP_ISequentialStream, true);
	}

	void SetDataSourceProperties(Settings& settings)
	{
		// load database settings
#ifdef FD_TRIAL
		m_strDBHostname = L"(local)";
		m_bDBIntegrated = true;
#else
		m_strDBHostname = settings.Database[L"hostname"];
		m_strDBLogin = settings.Database[L"login"];
		m_strDBPassword = settings.Database[L"password"];
		m_bDBIntegrated = settings.Database[L"integrated"].compare(L"true") == 0;
#endif
	}

	HRESULT OpenDataSource()
	{
		CDataSource _db;
		HRESULT hr;

		wchar_t buffer[1024];
		wstring strDBConnectionString = L"Provider=SQLOLEDB.1;%s;Data Source=%s;Initial Catalog=FaceDetector;Password=%s;User ID=%s";;
		wstring strDBSecurity;

		if (m_bDBIntegrated)
			strDBSecurity = L"Persist Security Info=True";
		else
			strDBSecurity = L"Integrated Security=SSPI;Persist Security Info=False";

		// try default sql server instance (MSSQLERVER, that should be omitted)
		swprintf(buffer, 1024, strDBConnectionString.c_str(),strDBSecurity.c_str(), m_strDBHostname.c_str(), m_strDBPassword.c_str(), m_strDBLogin.c_str());
		hr = _db.OpenFromInitializationString((LPCOLESTR)buffer);
		if (FAILED(hr))
		{
			_db.Close();
#ifdef FD_TRIAL
			// try SQLEXPERSS sql server instance
			m_strDBHostname += L"\\SQLEXPRESS";
			swprintf(buffer, 1024, strDBConnectionString.c_str(),strDBSecurity.c_str(), m_strDBHostname.c_str(), m_strDBPassword.c_str(), m_strDBLogin.c_str());
			hr = _db.OpenFromInitializationString((LPCOLESTR)buffer);
			if (FAILED(hr))
			{
				_db.Close();
				wstring message = L"[Person::ERROR]: Connection to database on server %s failed: hr= %u\r\n";
				LogDebugString(FormatWString(message.c_str(), m_strDBHostname.c_str(), hr));
				return hr;
			}
#else
			wstring message = L"[Person::ERROR]: Connection to database on server %s failed: hr= %u\r\n";
			LogDebugString(FormatWString(message.c_str(), m_strDBHostname.c_str(), hr));
			return hr;
#endif
		}


		return m_session.Open(_db);
	}

	void CloseDataSource()
	{
		m_session.Close();
	}

	operator const CSession&()
	{
		return m_session;
	}

	CSession m_session;

	DEFINE_COMMAND_EX(CPersonAccessor, L" \
	SELECT \
		Id, \
		Name, \
		Fname, \
		Template \
		FROM dbo.Person")

// This table/command contains column(s) that can be accessed
// via an ISequentialStream interface.  Not all providers, however,
// support this feature, and even those that do support it, are
// often limited to just one ISequentialStream per rowset.
// If you want to use streams in this accessor, use the sample
// line(s) of code below, and set the DBPROP_ISequentialStream
// rowset propery to true.  You can than use the Read() method
// to read the data, or Write() method to write the data (note
// that this requires that you change the STGM_READ stream property
// to STGM_WRITE or STGM_READWRITE).  For more information on
// ISequentialStream binding see the documentation

	// In order to fix several issues with some providers, the code below may bind
	// columns in a different order than reported by the provider

	BEGIN_COLUMN_MAP(CPersonAccessor)
		COLUMN_ENTRY_LENGTH_STATUS(1, m_Id, m_dwIdLength, m_dwIdStatus)
		COLUMN_ENTRY_LENGTH_STATUS(2, m_Name, m_dwNameLength, m_dwNameStatus)
		COLUMN_ENTRY_LENGTH_STATUS(3, m_Fname, m_dwFnameLength, m_dwFnameStatus)
		// BLOB_ENTRY_LENGTH_STATUS(4, IID_ISequentialStream, STGM_READ, m_Template, m_dwTemplateLength, m_dwTemplateStatus)
		COLUMN_ENTRY_LENGTH_STATUS(4, m_Template, m_dwTemplateLength, m_dwTemplateStatus)
	END_COLUMN_MAP()
};

class CPerson : public CCommand<CAccessor<CPersonAccessor> >
{
public:
	HRESULT OpenAll()
	{
		HRESULT hr;
		hr = OpenDataSource();
		if (FAILED(hr))
			return hr;
		__if_exists(GetRowsetProperties)
		{
			CDBPropSet propset(DBPROPSET_ROWSET);
			__if_exists(HasBookmark)
			{
				if( HasBookmark() )
					propset.AddProperty(DBPROP_IRowsetLocate, true);
			}
			GetRowsetProperties(&propset);
			return OpenRowset(&propset);
		}
		__if_not_exists(GetRowsetProperties)
		{
			__if_exists(HasBookmark)
			{
				if( HasBookmark() )
				{
					CDBPropSet propset(DBPROPSET_ROWSET);
					propset.AddProperty(DBPROP_IRowsetLocate, true);
					return OpenRowset(&propset);
				}
			}
		}
		return OpenRowset();
	}

	HRESULT OpenRowset(DBPROPSET *pPropSet = NULL)
	{
		HRESULT hr = Open(m_session, NULL, pPropSet);
#ifdef _DEBUG
		if(FAILED(hr))
			AtlTraceErrorRecords(hr);
#endif
		return hr;
	}

	void CloseAll()
	{
		Close();
		ReleaseCommand();
		CloseDataSource();
	}
};


