/*
 * Copyright 2013, Digital Epigraphy and Archaeology Group, University of 
 * Florida, Angelos Barmpoutis, Eleni Bozia, Robert Wagman.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * When this program is used for academic purposes, the following
 * article must be cited: A. Barmpoutis, E. Bozia, R. S. Wagman, "A novel 
 * framework for 3D reconstruction and analysis of ancient inscriptions", 
 * Journal of Machine Vision and Applications, 2010, Vol.21(6), p.989-998
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var dea_groups=[];
var dea_fields=[];
var dea_view=null;
var dea_view_edit=null;
var beta_host="research.dwi.ufl.edu/";
var dea_host="";

var DEA_STATIC=0;
var DEA_NORMAL=1;
var DEA_EDITDELETE=2;
var DEA_EDIT=3;

function DEAgroup() //Constructor
{
	this.name='';
	this.id=0;
	this.ord=0;
}

DEAgroup.prototype.setName=function(n){this.name=n;}
DEAgroup.prototype.setID=function(i){this.id=i;}
DEAgroup.prototype.setOrd=function(o){this.ord=parseInt(o);}

function DEAfield() //Constructor
{
	this.id=0;
	this.name='';
	this.description='';
	this.example='';
	this.type_id=0;
	this.group=null;
	this.ord=100000;
}

DEAfield.prototype.setName=function(n){this.name=n;}
DEAfield.prototype.setID=function(i){this.id=parseInt(i);}
DEAfield.prototype.setDescription=function(d){this.description=d;}
DEAfield.prototype.setExample=function(e){this.example=e;}
DEAfield.prototype.setTypeID=function(t){this.type_id=t;}
DEAfield.prototype.setGroup=function(g){this.group=g;}
DEAfield.prototype.setOrd=function(o){this.ord=parseInt(o);}

function loadDEAfields()
{
	var xmlhttp;
	if (window.XMLHttpRequest)
	{// code for IE7+, Firefox, Chrome, Opera, Safari
		xmlhttp=new XMLHttpRequest();
	}
	else
	{// code for IE6, IE5
  		xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
	}
	xmlhttp.open("GET","fields.xml",false);
	xmlhttp.send();
	var data=xmlhttp.responseXML;
	var num_of_groups=data.getElementsByTagName("field_group").length;
	for(var i=0;i<num_of_groups;i++)
	{
		dea_groups[i]=new DEAgroup();
		if(data.getElementsByTagName("field_group")[i].getElementsByTagName("name")[0].childNodes[0])  
		dea_groups[i].setName(data.getElementsByTagName("field_group")[i].getElementsByTagName("name")[0].childNodes[0].nodeValue);
		if(data.getElementsByTagName("field_group")[i].getElementsByTagName("id")[0].childNodes[0])  
		dea_groups[i].setID(data.getElementsByTagName("field_group")[i].getElementsByTagName("id")[0].childNodes[0].nodeValue);
		if(data.getElementsByTagName("field_group")[i].getElementsByTagName("ord")[0].childNodes[0])  
		dea_groups[i].setOrd(data.getElementsByTagName("field_group")[i].getElementsByTagName("ord")[0].childNodes[0].nodeValue);
		var fdata=data.getElementsByTagName("field_group")[i];
		var num_of_fields=fdata.getElementsByTagName("field").length;
		for(var j=0;j<num_of_fields;j++)
		{
			var fid=dea_fields.length;
			dea_fields[fid]=new DEAfield();
			if(fdata.getElementsByTagName("field")[j].getElementsByTagName("name")[0].childNodes[0])  
			dea_fields[fid].setName(fdata.getElementsByTagName("field")[j].getElementsByTagName("name")[0].childNodes[0].nodeValue);
			if(fdata.getElementsByTagName("field")[j].getElementsByTagName("id")[0].childNodes[0])
			dea_fields[fid].setID(fdata.getElementsByTagName("field")[j].getElementsByTagName("id")[0].childNodes[0].nodeValue);
			if(fdata.getElementsByTagName("field")[j].getElementsByTagName("description")[0].childNodes[0])  
			dea_fields[fid].setDescription(fdata.getElementsByTagName("field")[j].getElementsByTagName("description")[0].childNodes[0].nodeValue);
			if(fdata.getElementsByTagName("field")[j].getElementsByTagName("example")[0].childNodes[0])  
			dea_fields[fid].setExample(fdata.getElementsByTagName("field")[j].getElementsByTagName("example")[0].childNodes[0].nodeValue);
			if(fdata.getElementsByTagName("field")[j].getElementsByTagName("type_id")[0].childNodes[0])  
			dea_fields[fid].setTypeID(fdata.getElementsByTagName("field")[j].getElementsByTagName("type_id")[0].childNodes[0].nodeValue);
			if(fdata.getElementsByTagName("field")[j].getElementsByTagName("ord")[0].childNodes[0])  
			dea_fields[fid].setOrd(fdata.getElementsByTagName("field")[j].getElementsByTagName("ord")[0].childNodes[0].nodeValue);
			dea_fields[fid].setGroup(dea_groups[i]);
		}
	}
}

function DEAsource() //Constructor
{
	this.url='https://';
	this.citation_id='';
	this.citation=null;
	this.newfile=false;
	this.edited=false;
}

DEAsource.prototype.setURL=function(u){this.url=u;}
DEAsource.prototype.setCID=function(i){this.citation_id=i;this.citation=new DEArecord('citations',this.citation_id);this.citation.load();}
DEAsource.prototype.setNewFile=function(flag){this.newfile=flag;}
DEAsource.prototype.setEdited=function(flag){this.edited=flag;}
DEAsource.prototype.print=function(i)
{
	document.write(this.sprint(i));
}

DEAsource.prototype.sprint=function(i)
{
	var out="";
	if(this.citation_id.length>0 && this.citation!=null)
	{
		var a=this.citation.getFieldValue(22);
		var t=this.citation.getFieldValue(21);
		var p=this.citation.getFieldValue(20);
		var v=this.citation.getFieldValue(23);
		var n=this.citation.getFieldValue(38);
		var y=this.citation.getFieldValue(24);
		var pp=this.citation.getFieldValue(39);
		var pub=this.citation.getFieldValue(40);
		//out+="<div class=\"textarea_block\">";
		if(i>0)out+="<a name=\"source"+i+"\"></a><font class=\"bld\">["+i+"] </font>";
		out+="<font class=\"nrml\">";
		if(a.length>0) out+=""+a+". ";
		if(t.length>0) out+="\""+t+"\", ";
		if(p.length>0) out+="<i>"+p+"</i> ";
		if(v.length>0) out+=""+v+"";
		if(n.length>0) out+="("+n+")";
		if(p.length>0 || v.length>0 || n.length>0) out+=", ";
		if(y.length>0) out+=""+y+", ";
		if(pp.length>0) out+="pp. "+pp+"";
		if(pub.length>0) out+=pub;
		out+=".";
		
		if(this.newfile || this.edited)
		{
			out+="<input type=\"hidden\" name=\"citationid"+this.citation_id+"\" value=\""+this.citation_id+"\" />";
			if(this.newfile) out+="<input type=\"hidden\" name=\"citationid"+this.citation_id+"_newfile\" value=\"yes\" />";
			else out+="<input type=\"hidden\" name=\"citationid"+this.citation_id+"_newfile\" value=\"no\" />";	 
			
			if(a.length>0)	out+="<input type=\"hidden\" name=\"citationid"+this.citation_id+"_22\" value=\""+a+"\" />";
			if(t.length>0)	out+="<input type=\"hidden\" name=\"citationid"+this.citation_id+"_21\" value=\""+t+"\" />";
			if(p.length>0)	out+="<input type=\"hidden\" name=\"citationid"+this.citation_id+"_20\" value=\""+p+"\" />";
			if(v.length>0)	out+="<input type=\"hidden\" name=\"citationid"+this.citation_id+"_23\" value=\""+v+"\" />";
			if(n.length>0)	out+="<input type=\"hidden\" name=\"citationid"+this.citation_id+"_38\" value=\""+n+"\" />";
			if(y.length>0)	out+="<input type=\"hidden\" name=\"citationid"+this.citation_id+"_24\" value=\""+y+"\" />";
			if(pp.length>0)	out+="<input type=\"hidden\" name=\"citationid"+this.citation_id+"_39\" value=\""+pp+"\" />";
			if(pub.length>0)	out+="<input type=\"hidden\" name=\"citationid"+this.citation_id+"_40\" value=\""+pub+"\" />";
		}
		
		out+="</font>";
		//out+="</div>";
	}
	else
	{
		//out+="<div class=\"textarea_block\">";
		if(i>0) out+="<a name=\"source"+i+"\"></a><font class=\"bld\">["+i+"]&nbsp;</font>";
		out+="<font class=\"nrml\"><a href=\""+this.url+"\" target=\"_blank\">"+this.url+"</a></font>";
		//</div>";
	}
	return out;
}

DEAsource.prototype.sprintEdit=function()
{
	var out="";
	
	if(this.citation_id.length>0 && this.citation!=null)
	{
	out+="<font class=\"nrml\"><b>Author(s):</b> <i>(E. Bozia, R. Wagman, and A. Barmpoutis)</i></font><br><font class=\"chkbx\"><input type=\"text\" 	name=\"author\" value=\""+this.citation.getFieldValue(22)+"\" size=\"35\"></font><br><br>"+
		"<font class=\"nrml\"><b>Title:</b> <i>(e.g. The first 3D epigraphic library)</i></font><br><font class=\"chkbx\"><input type=\"text\" name=\"title\" value=\""+this.citation.getFieldValue(21)+"\" size=\"35\"></font><br><br>"+
		"<font class=\"nrml\"><b>Publication:</b> <i>(e.g. Digital Humanities Quarterly)</i></font><br><font class=\"chkbx\"><input type=\"text\" name=\"publication\" value=\""+this.citation.getFieldValue(20)+"\" size=\"35\"></font><br><br>"+
		"<font class=\"nrml\"><b>Volume:</b> <i>(e.g. 52)</i></font><br><font class=\"chkbx\"><input type=\"text\" name=\"volume\" value=\""+this.citation.getFieldValue(23)+"\" size=\"35\"></font><br><br>"+
		"<font class=\"nrml\"><b>Number:</b> <i>(e.g. 3)</i></font><br><font class=\"chkbx\"><input type=\"text\" name=\"number\" value=\""+this.citation.getFieldValue(38)+"\" size=\"35\"></font><br><br>"+
		"<font class=\"nrml\"><b>Pages:</b> <i>(e.g. 123-134)</i></font><br><font class=\"chkbx\"><input type=\"text\" name=\"pages\" value=\""+this.citation.getFieldValue(39)+"\" size=\"35\"></font><br><br>"+
		"<font class=\"nrml\"><b>Year:</b> <i>(e.g. 2012)</i></font><br><font class=\"chkbx\"><input type=\"text\" name=\"year\" value=\""+this.citation.getFieldValue(24)+"\" size=\"35\"></font><br><br>"+
		"<font class=\"nrml\"><b>Publisher:</b> <i>(e.g. Leipzig University Press)</i></font><br><font class=\"chkbx\"><input type=\"text\" name=\"publisher\" value=\""+this.citation.getFieldValue(40)+"\" size=\"35\"></font>";
	}
	else
	{
		out+="<font class=\"nrml\"><b>URL address:</b></font><br><font class=\"chkbx\">"+"<input type=\"text\" name=\"url\" value=\""+this.url+"\" size=\"35\"></font>";
	}
	return out;
}

DEAsource.prototype.updateAfterEdit=function()
{
	if(this.citation_id.length>0 && this.citation!=null)
	{
		if(this.citation.setFieldValue(22,document.getElementsByName("author")[0].value)) this.setEdited(true);
		if(this.citation.setFieldValue(21,document.getElementsByName("title")[0].value)) this.setEdited(true);
		if(this.citation.setFieldValue(20,document.getElementsByName("publication")[0].value)) this.setEdited(true);
		if(this.citation.setFieldValue(23,document.getElementsByName("volume")[0].value)) this.setEdited(true);
		if(this.citation.setFieldValue(38,document.getElementsByName("number")[0].value)) this.setEdited(true);
		if(this.citation.setFieldValue(39,document.getElementsByName("pages")[0].value)) this.setEdited(true);
		if(this.citation.setFieldValue(24,document.getElementsByName("year")[0].value)) this.setEdited(true);
		if(this.citation.setFieldValue(40,document.getElementsByName("publisher")[0].value)) this.setEdited(true);
	}
	else
	{
		if(this.url!=document.getElementsByName("url")[0].value) this.setEdited(true);
		this.setURL(document.getElementsByName("url")[0].value);
	}
}

function DEAeditor() //Constructor
{
	this.editor_id='';
	this.editor=null;
}

DEAeditor.prototype.setEID=function(i){this.editor_id=i;this.editor=new DEArecord('editors',this.editor_id);this.editor.load();}
DEAeditor.prototype.print=function(i)
{
	document.write(this.sprint(i));
}
DEAeditor.prototype.sprint=function(i)
{
	var out="";
	if(this.editor_id.length>0 && this.editor!=null)
	{
		var n=this.editor.getFieldValue(41);
		out+="<div class=\"textarea_block\"><a name=\"editor"+i+"\"></a><font class=\"bld\">[E"+i+"] </font><font class=\"nrml\">";
		if(n.length>0) out+=""+n+".";
		out+="</font></div>";
	}
	return out;
}



function DEAentry() //Constructor
{
	this.field_id=0;
	this.field=null;
	this.value='';
	this.sources=[];
	this.editors=[];
	this.editable=false;
}

DEAentry.prototype.setFieldID=function(i){this.field_id=parseInt(i);}
DEAentry.prototype.setValue=function(v){this.value=v;}
DEAentry.prototype.addSource=function(s){this.sources[this.sources.length]=s;}
DEAentry.prototype.addEditor=function(e){this.editors[this.editors.length]=e;}
DEAentry.prototype.setEditable=function(e){this.editable=e;}
DEAentry.prototype.sprintPostValue=function()
{
	var postv="";
	if(this.field.id==11 || this.field.id==12) postv=" cm";
	else if(this.field.id==34 || this.field.id==35 || this.field.id==49) postv=" px";
	return postv;
}

DEAentry.prototype.sprintName=function(prnt)
{
	var n=this.field.name;
	//Date will appear as Digitization Date for electronic files, i.e. 3D objects, images, and heightmaps
	if(this.field.id==8 && (prnt.path=="objects" || prnt.path=="images" || prnt.path=="heightmaps")) n="Digitization "+n;
	//Principal Investigators will appear in the case of multiple names.
	else if(this.field.id==44 && this.value.indexOf(";")>=0) n=n+"s";
	
	return n;
}

DEAentry.prototype.sprint=function(prnt)
{
	var v=this.value;
	var n=this.sprintName(prnt);
	var postv=this.sprintPostValue();
	var out="";

	if(this.editable==false)
	{
		if(this.field.id==34 || this.field.id==35 || this.field.id==49)//width or height or depth range
		{
			var dpi
			if(prnt.getFieldValue(33).length>0)
			{
				var dpi=parseFloat(prnt.getFieldValue(33));
				out+="<font class=\"bld\">"+n+":</font><font class=\"nrml\"> "+Math.round(((parseInt(v)*2.54)/dpi)*100)/100+" cm ("+v+postv+")</font>";
			}
			else
			out+="<font class=\"bld\">"+n+":</font><font class=\"nrml\"> "+v+postv+"</font>";
		}
		else
			out+="<font class=\"bld\">"+n+":</font><font class=\"nrml\"> "+v+postv+"</font>";
	}
	else
	{	
		if(this.field.id==27)//Description
			out+="<font class=\"bld\">"+n+":</font><img src=\"question_icon.png\" align=\"top\" height=\"12px\" title=\""+this.field.description+"\"><br><textarea name=\"fieldid"+this.field.id+"\" rows=\"6\" cols=\"35\">"+v+"</textarea><br>";
		else
			out+="<font class=\"bld\">"+n+":</font><img src=\"question_icon.png\" align=\"top\" height=\"12px\" title=\""+this.field.description+"\"><br><input type=\"text\" name=\"fieldid"+this.field.id+"\" value=\""+v+"\" size=\"35\"></input><font class=\"nrml\">"+postv+"</font><br>";
	}

	return out;
}

DEAentry.prototype.print=function(prnt)
{
	document.write(this.sprint(prnt));
}

DEAentry.prototype.findField=function()
{
	//FIND FIELD
	var found=-1;
	for(var j=0;(j<dea_fields.length)&&(found==-1);j++)
		if(dea_fields[j].id==this.field_id) {found=j;this.field=dea_fields[j];}
	if(found==-1) return false;
	else return true;
}

function getCookie(c_name)
{
var c_value = document.cookie;
var c_start = c_value.indexOf(" " + c_name + "=");
if (c_start == -1){c_start = c_value.indexOf(c_name + "=");}
if (c_start == -1){c_value = null;}
else{
  c_start = c_value.indexOf("=", c_start) + 1;
  var c_end = c_value.indexOf(";", c_start);
  if (c_end == -1){c_end = c_value.length;}
c_value = unescape(c_value.substring(c_start,c_end));
}
return c_value;
}

function DEArecord(p,i,x,t) //Constructor
{
	this.path=p;
	this.type=t;
	this.filename="";
	if(typeof i !== 'undefined')
	{
		this.id=i;
	}
	else
	{
		//var tokens=p.split("/");
		//this.id=tokens.pop().split(".").shift();
		//this.path=tokens.pop();
		var p_=p.substring(0,p.indexOf("/Info.xml"));
		this.path=p_.substring(0,p_.indexOf("/",2)+1);
		this.id=p_.substring(p.indexOf("/",2)+1);
		this.filename="Info.xml";
		this.type="heightmap";
	}

	if(typeof x !== 'undefined'){
		this.filename=x;
	}

	this.entries=[];
	this.record_links=[];
	this.neobject_grandparent=null;
	this.mode=DEA_NORMAL;
	this.onRecordLoaded=function(){}
	this.aux=null;
	this.stamp=Date.now();
	//log('Record created: '+this.id+" "+this.stamp+" "+father);
}

DEArecord.prototype.setAux=function(aux)
{
	this.aux=aux;
}

DEArecord.prototype.setMode=function(mode)
{
	this.mode=mode;
}

DEArecord.prototype.addEntry=function(new_entry)
{
	//CHECK IF WE HAVE THIS FIELD ALREADY
	if(this.containsField(new_entry.field_id)==true) return;

	var i=this.entries.length;
       this.entries[i]=new_entry;
	
	//SORT THE ENTRIES
	found=-1;
	for(var j=0;(j<this.entries.length-1)&&(found==-1);j++)
		if(this.entries[j].field==null || this.entries[j].field.ord>this.entries[i].field.ord) found=j;
	if(found!=-1)
	{
		var tmp=this.entries[i];
		for(var j=this.entries.length-1;j>found;j--)
		{
			this.entries[j]=this.entries[j-1];
		}
		this.entries[found]=tmp;
	}
}

//This function loads the xml record file.
DEArecord.prototype.handleLoadedFile=function(data,asynchronous,quickload)
{
	if(data==null)
	{
		//log("NULL DATA: "+this.id+" "+this.aux+" "+this.stamp); 
		console.log("NULL XML DATA received from "+this.id+" broken xml file?");
		return;
	}
	
	//log("ProcessLoaded: "+this.id+" "+this.aux+" "+this.stamp);
	var num_of_items=data.getElementsByTagName("field").length;
	for(var i=0;i<num_of_items;i++)
	{
		var field=data.getElementsByTagName("field")[i];
		if(field.parentNode.nodeName=="record")
		{
		var new_entry=new DEAentry();
		if(field.getAttribute("id"))  
		new_entry.setFieldID(field.getAttribute("id"));
		
		if(field.getAttribute("value"))  
		new_entry.setValue(field.getAttribute("value"));
		
		if(field.getElementsByTagName("source")[0])
		{  
			for(var j=0;j<field.getElementsByTagName("source").length;j++)
			{
				var source=field.getElementsByTagName("source")[j];
				if(source.getAttribute("url"))	
				{
					var s=new DEAsource();
					s.setURL(source.getAttribute("url"));	
					new_entry.addSource(s);
				}
				else if(source.getAttribute("id"))	
				{
					if(!quickload)
					{
						var s=new DEAsource();
						s.setCID(source.getAttribute("id"));
						new_entry.addSource(s);
					}
				}
			}
		}
		if(field.getElementsByTagName("editor")[0])
		{  
			for(var j=0;j<field.getElementsByTagName("editor").length;j++)
			{
				var editor=field.getElementsByTagName("editor")[j];
				if(editor.getAttribute("id"))
				{
					if(!quickload)
					{
						var s=new DEAeditor();
						s.setEID(editor.getAttribute("id"));
						new_entry.addEditor(s);
					}
				}
				
			}
		}
		if(new_entry.findField())
		{	this.addEntry(new_entry);
		}
		}
	}	
	num_of_items=data.getElementsByTagName("record_link").length;
	for(var i=0;i<num_of_items;i++)
	{
		var record_link=data.getElementsByTagName("record_link")[i];
		if(record_link.getAttribute("type")=="object")
		{  
			this.record_links[i]=new DEArecord("objects",record_link.getAttribute("value"));
		}
		else if(record_link.getAttribute("type")=="neobject")
		{  
			//this.record_links[i]=new DEArecord("neobject",record_link.getAttribute("value"));
			this.record_links[i]=new DEArecord(this.path,this.id,record_link.getAttribute("value"),"neobject");
		
		}
		else if(record_link.getAttribute("type")=="heightmap")
		{  
			this.record_links[i]=new DEArecord(this.path,this.id,record_link.getAttribute("value"),"heightmap");
		}
		else if(record_link.getAttribute("type")=="image")
		{  
			this.record_links[i]=new DEArecord("images",record_link.getAttribute("value"));
			var n=this.record_links[i].id.toLowerCase();
			if(n.indexOf("left")>=0) 
			{
				var e=new DEAentry();
				e.setFieldID(48);//Light Direction
				e.setValue("-1,0,0");
				this.record_links[i].addEntry(e);
			}
			else if(n.indexOf("right")>=0) 
			{
				var e=new DEAentry();
				e.setFieldID(48);//Light Direction
				e.setValue("1,0,0");
				this.record_links[i].addEntry(e);
			}
			else if(n.indexOf("top")>=0) 
			{
				var e=new DEAentry();
				e.setFieldID(48);//Light Direction
				e.setValue("0,1,0");
				this.record_links[i].addEntry(e);
			}
			else if(n.indexOf("bottom")>=0) 
			{
				var e=new DEAentry();
				e.setFieldID(48);//Light Direction
				e.setValue("0,-1,0");
				this.record_links[i].addEntry(e);
			}
		}
		else if(record_link.getAttribute("type")=="link")
		{  
			this.record_links[i]=new DEArecord("links",record_link.getAttribute("value"));
		}
		else this.record_links[i]=new DEArecord("","");
	}
	//log("Loaded: "+this.id+" "+this.aux+" "+this.stamp);
	this.onRecordLoaded();
}

function log(msg) {
    setTimeout(function() {
        throw new Error(msg);
    }, 0);
}

DEArecord.prototype.load=function(asynchronous,quickload)
{
	//log('load '+this.id+' '+this.aux);
	//if quickload is not specified, it is considered false
	quickload = typeof quickload !== 'undefined' ? quickload : false;
	
	//if asynchronous is not specified, it is considered false
	asynchronous = typeof asynchronous !== 'undefined' ? asynchronous : false;
	
	if(asynchronous) quickload=false;
	
	var xmlhttp;
	if (window.XMLHttpRequest)
	{// code for IE7+, Firefox, Chrome, Opera, Safari
		xmlhttp=new XMLHttpRequest();
	}
	else
	{// code for IE6, IE5
  		xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
	}
	if(asynchronous)
	{
		//log('asynchronous '+this.aux);
		var r=this;
		xmlhttp.onreadystatechange=function()
		{
			if (xmlhttp.readyState==4 && xmlhttp.status==200)
			{
				//log('-'+xmlhttp.status+" "+r.id+" "+r.aux+" "+r.stamp);
				if(xmlhttp.responseXML!=null) r.handleLoadedFile(xmlhttp.responseXML,true,true);
				else 
				{
					//log("NULL DATA");
					xmlhttp.open("GET",dea_host+"db/"+r.path+"/"+r.id+".xml",true);
					xmlhttp.send();
				}
			}
			//else log(xmlhttp.status);
		}
		xmlhttp.open("GET",dea_host+"db/"+this.path+"/"+this.id+".xml",asynchronous);
		xmlhttp.send();
	}
	else
	{
		/*if(!quickload)
		{
			xmlhttp.open("GET",dea_host+"sandbox/"+getCookie("deaUserID")+"/"+this.path+"/"+this.id+".xml"+"?"+(new Date()).getTime(),asynchronous);
			xmlhttp.send();
		}
		if(quickload || xmlhttp.responseXML==null)*/
		{
			if(quickload) xmlhttp.open("GET",dea_host+this.path+this.id+"/"+this.filename,asynchronous);
			else xmlhttp.open("GET",dea_host+this.path+this.id+"/"+this.filename+"?"+(new Date()).getTime(),asynchronous);
			xmlhttp.send();	
		}
		this.handleLoadedFile(xmlhttp.responseXML,false,quickload);
	}
}


DEArecord.prototype.loadNEOlinks=function(quickload)
{
	//if quickload is not specified, it is considered false
	quickload = typeof quickload !== 'undefined' ? quickload : false;	
	
	for(var i=0;i<this.record_links.length;i++)
	{
			
		if(this.record_links[i].type=="neobject")
		{
			this.record_links[i].load(false,quickload);
			
			if(this.neobject_grandparent==null && quickload==false)
			{
			    for(var j=0;j<this.record_links[i].record_links.length && this.neobject_grandparent==null;j++)
				{
					if(this.record_links[i].record_links[j].type=="neobject")
					{
						this.neobject_grandparent=this.record_links[i].record_links[j];
						this.neobject_grandparent.load(false,quickload);
					}
				}
			}
		}
	}
}

DEArecord.prototype.getFieldDescription=function(fid)
{
	var ret="";
	var found=-1;
	for(var i=0;i<dea_fields.length && found==-1;i++)
	{
		if(dea_fields[i].id==fid)
		{
			ret=dea_fields[i].description;found=i;
		}
	}
	return ret;
}

DEArecord.prototype.getFieldValue=function(fid)
{
	var ret="";
	var found=-1;
	for(var i=0;i<this.entries.length && found==-1;i++)
	{
		if(this.entries[i].field_id==fid && this.entries[i].value.length>0)
		{
			ret=this.entries[i].value;found=i;
		}
	}
	return ret;
}

DEArecord.prototype.setFieldValue=function(fid,v)
{
	var changed=false;
	
	var found=-1;
	for(var i=0;i<this.entries.length && found==-1;i++)
	{
		if(this.entries[i].field_id==fid)
		{
			if(this.entries[i].value!=v) changed=true;
			ret=this.entries[i].value=v;found=i;
		}
	}
	
	if(found==-1)
	{
		if(v.length>0) changed=true;
		var new_entry=new DEAentry();
		new_entry.setFieldID(fid);
		new_entry.setValue(v);
		if(new_entry.findField()) this.addEntry(new_entry);
	}
	return changed;
}

DEArecord.prototype.containsField=function(fid)
{
	var ret=false;
	var found=-1;
	for(var i=0;i<this.entries.length && found==-1;i++)
	{
		if(this.entries[i].field_id==fid)
		{
			ret=true;found=i;
		}
	}
	return ret;
}

DEArecord.prototype.getTitle=function()
{
     var t=this.getFieldValue(26);
     if(t.length>0) return t;
     else
     {
	if(this.type=="object") t="Digital 3D object";
	else if(this.type=="heightmap") t="Digital heightmap";
	else if(this.type=="image") t="Digital image";
	else if(this.type=="link") t="External digital resource";
	else if(this.type=="neobject") t="Physical object";
	else t="Digital heightmap";
       return t;
     }
}

DEArecord.prototype.getMasterTitle=function()
{
	var t="";
	var tmp="";
	var found=false;
	for(var i=0;i<this.record_links.length && !found;i++)
	{
		tmp=this.record_links[i].getFieldValue(26);
		if(tmp.length>0)
		{
			found=true;
			t=tmp;
		}
	}
	if(t.length>0) return t;
	else return this.getTitle();
}

DEArecord.prototype.printTitle=function()
{
	var out="<div class=\"textarea_block dark_bkg\"><font class=\"ttl\">"+this.getTitle()+"</font></div>";
	return out;
}

DEArecord.prototype.printTitleEdit=function(view)
{
	var out="<div class=\"textarea_block dark_bkg\"><font class=\"ttl\">"+this.getTitle()+"</font><div style=\"display:block;position:relative;float:right;\"><form action=\"https://research.dwi.ufl.edu/www.digitalepigraphy.org/edit.php?"+view.dea_record.path.substring(0,view.dea_record.path.length-1)+"="+view.dea_record.id+"\" method=\"post\" target=\"_blank\" name=\"form1\"><input type=\"image\" src=\"edit.png\"></form></div></div>";
	return out;
}

DEArecord.prototype.printTitleDone=function()
{
	var out="";
		out+="<div class=\"textarea_block dark_bkg\"><input type=\"text\" name=\"fieldid26\" value=\""+this.getFieldValue(26)+"\" size=\"34\"><img src=\"question_icon.png\" align=\"top\" height=\"12px\" title=\""+this.getFieldDescription(26)+"\"><div style=\"display:block;position:relative;float:right;\"><input type=\"image\" src=\"done.png\"><input name=\"done_clicked\" type=\"hidden\"  value=\"yes\" /><input name=\"path\" type=\"hidden\"  value=\""+this.path+"\" /><input name=\"id\" type=\"hidden\"  value=\""+this.id+"\" /></div></div>";
	return out;
}

DEArecord.prototype.print=function(view)
{
	document.write(this.sprint(view));
}

DEArecord.prototype.sprint=function(view)
{
   var out="";
   if(this.mode==DEA_STATIC)
   {
		out+=this.printTitle();
		out+=this.sprintNormal(view);
   }
   else if(this.mode==DEA_NORMAL)
   {
		out+=this.printTitleEdit(view);
		out+=this.sprintNormal(view);
   }
   else if(this.mode==DEA_EDITDELETE)
   {
		out+=this.printTitleEditDelete();
		out+=this.sprintNormal(view);
   }
   else if(this.mode==DEA_EDIT)
   {
		out+=this.printTitleDone();
		out+=this.sprintEdit(view);
   }
   return out;
}

DEArecord.prototype.sprintNormal=function(view)
{
	var out="";
	for(var i=0;i<this.entries.length;i++)
	{
		if(this.entries[i].field!=null && this.entries[i].value.length>0 && this.entries[i].field_id!=26)
		{
		out+="<div class=\"textarea_block\">";
		this.entries[i].setEditable(false);
		out+=this.entries[i].sprint(this);
		if(this.entries[i].sources.length>0)
		{
			out+="<font class=\"nrml\"><sup> ";
			out+=view.print_source_pointer("",this.entries[i].sources[0]);
			for(var j=1;j<this.entries[i].sources.length;j++)
			{
				out+=view.print_source_pointer(", ",this.entries[i].sources[j]);
			}
			out+="</sup></font>";
		}
		if(this.entries[i].editors.length>0)
		{
			view.print_editor_pointer("",this.entries[i].editors[0]);
			for(var j=1;j<this.entries[i].editors.length;j++)
			{
				view.print_editor_pointer(", ",this.entries[i].editors[j]);
			}
		}
		out+="</div>";
		}
	}
	return out;
}

DEArecord.prototype.printTitleEditDelete=function()
{
	var out="<div class=\"textarea_block dark_bkg\"><font class=\"ttl\">"+this.getTitle()+"</font><div style=\"display:block;position:relative;float:right;\"><form action=\"#\" onsubmit=\"return onRecordDelete('"+this.path+"','"+this.id+"');\" name=\"form1\"><input type=\"image\" src=\"delete.png\"></form></div><div style=\"display:block;position:relative;float:right;\"><form action=\"#\" onsubmit=\"return onRecordEdit('"+this.path+"','"+this.id+"',this);\" name=\"form1\"><input type=\"image\" src=\"edit.png\"></form></div></div>";
	return out;
}

DEArecord.prototype.sprintEdit=function(view)
{
	var out="";
	for(var i=0;i<this.record_links.length;i++)
	{
		out+="<input name=\"link"+this.record_links[i].path+i+"\" type=\"hidden\"  value=\""+this.record_links[i].id+"\" />";
		if(this.record_links[i].containsField(48))
		out+="<input name=\"rlfieldlink"+this.record_links[i].path+i+"fieldid48\" type=\"hidden\"  value=\""+this.record_links[i].getFieldValue(48)+"\" />";
		
	}
	for(var i=0;i<this.entries.length;i++)
	{
		if(this.entries[i].field!=null && this.entries[i].field_id!=26)
		{
		out+="<div class=\"textarea_block\">";
		this.entries[i].setEditable(true);
		out+=this.entries[i].sprint(this);
		if(this.entries[i].sources.length>0)
		{
			out+="<font class=\"nrml\">Links:<sup> ";
			for(var j=0;j<this.entries[i].sources.length;j++)
			{
				if(j==0) out+=view.print_source_pointer("",this.entries[i].sources[j]);
				else out+=view.print_source_pointer(", ",this.entries[i].sources[j]);
				out+=" <a href=\"#\" onclick=\"return onDeleteResource("+i+","+j+");\"><font class=\"nrml\">[x]</font></a>";
				if(this.entries[i].sources[j].citation_id.length>0) out+="<input name=\"fieldid"+this.entries[i].field_id+"_cit"+j+"\" type=\"hidden\"  value=\""+this.entries[i].sources[j].citation_id+"\" />";
				else if(this.entries[i].sources[j].url.length>0)out+="<input name=\"fieldid"+this.entries[i].field_id+"_url"+j+"\" type=\"hidden\"  value=\""+this.entries[i].sources[j].url+"\" />";
			}
			out+="</sup></font>";
		}
		out+=" <a href=\"#\" onclick=\"return onAddResource("+i+");\"><font class=\"nrml\">[add source]</font></a>";
		if(this.entries[i].editors.length>0)
		{
			for(var j=0;j<this.entries[i].editors.length;j++)
			{
				if(j==0) view.print_editor_pointer("",this.entries[i].editors[j]);
				else view.print_editor_pointer(", ",this.entries[i].editors[j]);
				if(this.entries[i].editors[j].editor_id.length>0) out+="<input name=\"fieldid"+this.entries[i].field_id+"_edi"+j+"\" type=\"hidden\"  value=\""+this.entries[i].editors[j].editor_id+"\" />";
			}
		}
		out+="</div>";
		}
	}
	return out;
}

DEArecord.prototype.sprintKeywords=function(keys,hide)
{
	var out="";
	var k=[];
	for(var j=0;j<keys.length;j++) k[j]=keys[j].toLowerCase();
	
	
	for(var i=0;i<this.record_links.length;i++)
	{
		if(this.record_links[i].type=="neobject" && this.type!="neobject")
		{
			out+=this.record_links[i].sprintKeywords(keys,hide);
		}
	}
	
	//PRINT GRANT PARENTS IF ANY
	if(this.neobject_grandparent!=null) out+=this.neobject_grandparent.sprintKeywords(keys,hide);
	
	for(var i=0;i<this.entries.length;i++)
	{
		if(this.entries[i].field!=null && this.entries[i].value.length>0 && this.entries[i].field_id!=26)
		{
			var v=this.entries[i].value.toLowerCase();
			var found=false;
			if(hide)
			{
				for(var j=0;j<v.length && !found;j++)
				if(v.indexOf(k[j])!=-1) found=true;
				if(!found) out+="<font style=\"font-weight:700;\">"+this.entries[i].sprintName(this)+":</font> "+this.entries[i].value+this.entries[i].sprintPostValue()+", ";
			}
			else
			{
				var redflags=[];
				for(var j=0;j<v.length;j++) redflags[j]=false;
				
				for(var j=0;j<k.length;j++)
				{
					var indx=v.indexOf(k[j]);
					if(indx!=-1) found=true;
					while(indx!=-1)
					{
						for(var indx_i=indx;indx_i<indx+k[j].length;indx_i++) redflags[indx_i]=true;
						indx=v.indexOf(k[j],indx+1);
					}
				}
				
				if(found)
				{
					out+="<font style=\"font-weight:700;\">"+this.entries[i].sprintName(this)+":</font> ";
					var rednow=false;
					var lastshown=-1;
					var lastred=-1;
					for(var j=0;j<redflags.length;j++)
					{
						if(!rednow && redflags[j])
						{
							rednow=true;
							var dots=false;
							for(var jj=Math.max(j-10,lastshown+1);jj<j;jj++)
							{
								if(!dots)
								{
									if(jj>0)out+="...";
									dots=true;
								}
								out+=this.entries[i].value[jj];
							}
							out+="<font color=\"#FF0000\">";
						}
						else if(rednow && !redflags[j])
						{
							rednow=false;	
							out+="</font>";
						}
						if(rednow)
						{
							out+=this.entries[i].value[j];
							lastshown=j;
							lastred=j;
						}
						else if(lastred>-1 && j<lastred+10)
						{
							out+=this.entries[i].value[j];
							lastshown=j;
						}
					}
					if(rednow)out+="</font>";
					else if(lastshown<redflags.length-1) out+="...";
					out+=this.entries[i].sprintPostValue()+", ";
				}
			}
		}
	}
	return out;
}

DEArecord.prototype.sprintPlain=function()
{
	var out="";
	
	for(var i=0;i<this.record_links.length;i++)
	{
		if(this.record_links[i].type=="neobject")
		{
			out+=this.record_links[i].sprintPlain();
		}
	}
	for(var i=0;i<this.entries.length;i++)
	{
		if(this.entries[i].field!=null && this.entries[i].value.length>0 && this.entries[i].field_id!=26)
		{
			out+=" "+this.entries[i].value+this.entries[i].sprintPostValue()+", ";
		}
	}
	return out;
}

DEArecord.prototype.sprintPlainHTML=function()
{
	var out="";
	
	for(var i=0;i<this.record_links.length;i++)
	{
		if(this.record_links[i].type=="neobject")
		{
			out+=this.record_links[i].sprintPlain();
		}
	}
	for(var i=0;i<this.entries.length;i++)
	{
		if(this.entries[i].field!=null && this.entries[i].value.length>0 && this.entries[i].field_id!=26)
		{
			out+="<b>"+this.entries[i].sprintName(this)+":</b> "+this.entries[i].value+this.entries[i].sprintPostValue()+", ";
		}
	}
	return out;
}


DEArecord.prototype.printNEOlinks=function(view)
{
	var out="";
	for(var i=0;i<this.record_links.length;i++)
	{
		if(this.record_links[i].type=="neobject")
		{
			out+=this.record_links[i].sprint(view);
		}
	}
	
	if(this.neobject_grandparent!=null) out+=this.neobject_grandparent.sprint(view);
	
	return out;
}


DEArecord.prototype.printEmbed=function()
{
	var out="";
	var t="";
	if(this.path=="objects") t="object="+this.id;
	else if(this.path=="heightmaps") t="heightmap="+this.id;
	else t="heightmap="+this.id;
	if(t.length>0)
	{
		out+="<div class=\"textarea_block dark_bkg\"><font class=\"ttl\">Embed in HTML</font></div>";
		out+="<div class=\"textarea_block\"><font class=\"chkbx\"><b>HTML tag:</b> &lt;iframe src=&quot;https://digitalepigraphy.github.io/viewer2.5/view.html?"+t+"&quot; width=&quot;600px&quot; height=&quot;400px&quot; frameborder=&quot;0&quot; scrolling=&quot;no&quot;&gt;&lt;/iframe&gt;</font></div>";
	}	
	return out;
}

DEArecord.prototype.collectLinkedObjects=function(view)
{
	for(var i=0;i<this.record_links.length;i++)
	{
		if(this.record_links[i].path.length>0 && this.record_links[i].id.length>0 && this.record_links[i].type!="neobject" && view.dea_record.id!=this.record_links[i].id)
		{
			var found=-1;
			for(var j=0;(j<view.linked_objects.length) && (found==-1);j++)
			{
				if(view.linked_objects[j].path==this.record_links[i].path && view.linked_objects[j].id==this.record_links[i].id) found=j;
			}
			if(found==-1)
			{
				view.linked_objects[view.linked_objects.length]=this.record_links[i];
			}
		}
		this.record_links[i].collectLinkedObjects(view);
	}
}

function DEAview()
{
   this.mode=DEA_NORMAL;
   this.dea_record=null;
   this.linked_objects=[];
   this.printed_editors=[];
   this.printed_sources=[];
   this.edit_sources=false;
}

DEAview.prototype.editResources=function(value)
{
	this.edit_sources=value;
}

DEAview.prototype.load=function(path,rid)
{
   this.dea_record=new DEArecord(path,rid,"Info.xml","heightmap");
   this.dea_record.load();
   this.dea_record.loadNEOlinks();
   this.setMode(this.mode);
}

DEAview.prototype.setMode=function(mode)
{
	this.mode=mode;
	this.dea_record.setMode(mode);
	for(var i=0;i<this.dea_record.record_links.length;i++)
	{
		this.dea_record.record_links[i].setMode(mode);
	}
	if(this.dea_record.neobject_grandparent!=null) this.dea_record.neobject_grandparent.setMode(mode);
}

DEAview.prototype.print=function()
{
	document.write(this.sprint());
}

DEAview.prototype.sprint=function()
{
   this.printed_sources=[];

	var out="";
    out+="<div class=\"textarea_space\">";
	out+=this.print_linked_objects();

	out+=this.dea_record.printNEOlinks(this);
	
	out+=this.dea_record.sprint(this);
	
	out+=this.dea_record.printEmbed();
	out+=this.print_sources();
	out+=this.print_editors();
	
	
	out+="</div>";
	return out;
}

DEAview.prototype.print_source_pointer=function(h,s)
{
	var out="";
	if(s==null) return out;
	var found=-1;
	if(s.citation_id.length>0)
	{
		for(var i=0;i<(this.printed_sources.length) && (found==-1);i++)
		{
			if(this.printed_sources[i].citation_id==s.citation_id) found=i;
		}
	}
	else if(s.url.length>0)
	{
		for(var i=0;i<(this.printed_sources.length) && (found==-1);i++)
		{
			if(this.printed_sources[i].url==s.url) found=i;
		}
	}
	if(found==-1)
	{
		var i=this.printed_sources.length;
		this.printed_sources[i]=s;
		out+=h+"<a href=\"#source"+(i+1)+"\">"+(i+1)+"</a>";
	}
	else
	{
		out+=h+"<a href=\"#source"+(found+1)+"\">"+(found+1)+"</a>";
	}
	return out;
}

DEAview.prototype.print_sources=function()
{
	var out="";
	if(this.printed_sources.length>0) 
	{
		if(this.mode==DEA_STATIC)
		{
			if(this.edit_sources==false)out+="<div class=\"textarea_block dark_bkg\"><font class=\"ttl\">Sources</font></div>";
			else out+="<div class=\"textarea_block dark_bkg\"><font class=\"ttl\">Sources</font><div style=\"display:block;position:relative;float:right;\"><input type=\"image\" src=\"done.png\"><input name=\"done_clicked\" type=\"hidden\"  value=\"yes\" /><input name=\"path\" type=\"hidden\"  value=\"citations\" /><input name=\"id\" type=\"hidden\"  value=\"empty\" /></div></div>";
		}
		else if(this.mode==DEA_NORMAL) out+="<div class=\"textarea_block dark_bkg\"><font class=\"ttl\">Sources</font><div style=\"display:block;position:relative;float:right;\"><form action=\"https://research.dwi.ufl.edu/www.digitalepigraphy.org/edit.php?"+this.dea_record.path.substring(0,this.dea_record.path.length-1)+"="+this.dea_record.id+"\" method=\"post\" target=\"_blank\" name=\"form1\"><input type=\"image\" src=\"edit.png\"></form></div></div>";
		else out+="<div class=\"textarea_block dark_bkg\"><font class=\"ttl\">Sources</font><div style=\"display:block;position:relative;float:right;\"><form action=\"#\" onsubmit=\"return onEditResource(this);\" name=\"form1\"><input type=\"image\" src=\"edit.png\"></form></div></div>";
	}
	for(var i=0;i<this.printed_sources.length;i++)
	{
		if(this.edit_sources==false) out+="<div class=\"textarea_block\">"+this.printed_sources[i].sprint(i+1)+"</div>";
		else out+="<div class=\"textarea_block\"><table><tr><td><input type=\"radio\" name=\"source_radio\"/ value=\""+i+"\" onchange=\"onResourceChange();\"/></td><td id=\"source_"+i+"\">"+this.printed_sources[i].sprint(i+1)+"</td></tr></table></div>";
	}
	return out;
}


DEAview.prototype.print_editor_pointer=function(h,s)
{
	if(s==null) return;
	var found=-1;
	if(s.editor_id.length>0)
	{
		for(var i=0;i<(this.printed_editors.length) && (found==-1);i++)
		{
			if(this.printed_editors[i].editor_id==s.editor_id) found=i;
		}
	}
	if(found==-1)
	{
		var i=this.printed_editors.length;
		this.printed_editors[i]=s;
		//document.write(h+"<a href=\"#editor"+(i+1)+"\">"+(i+1)+"</a>");
	}
	else
	{
		//document.write(h+"<a href=\"#editor"+(found+1)+"\">"+(found+1)+"</a>");
	}
}

DEAview.prototype.print_editors=function()
{
	var out="";
	if(this.printed_editors.length>0) out+="<div class=\"textarea_block dark_bkg\"><font class=\"ttl\">Editors</font></div>";
	for(var i=0;i<this.printed_editors.length;i++)
	{
		out+=this.printed_editors[i].sprint(i+1);
	}
	return out;
}

DEAview.prototype.print_linked_objects=function()
{
	this.linked_objects=[];
	this.dea_record.collectLinkedObjects(this);
	var counter=0;
	var out="";
	if(this.linked_objects.length>0)
	{
		out+="<div class=\"textarea_images black_bkg\">";
		for(var i=0;i<this.linked_objects.length;i++)
		{
			if(this.linked_objects[i].path!="images")
			{
				out+="<img src=\"https://research.dwi.ufl.edu/www.digitalepigraphy.org/db/"+this.linked_objects[i].path+"/"+this.linked_objects[i].id+".thmb.png\" onclick=\"window.parent.postMessage('both:"+this.linked_objects[i].path.substring(0,this.linked_objects[i].path.length-1)+"="+this.linked_objects[i].id+"', '*');\" onMouseover=\"this.style.cursor='pointer';\">";
				counter+=1;
			}
		}
		out+="</div>";
	}
	if(counter==0) out="";
	return out;
}

DEAview.prototype.findRecord=function(path,rid)
{
	var out=null;
	if(this.dea_record.id==rid && this.dea_record.path==path)
		out=this.dea_record;
	else
	{
		var found=false;
		for(var i=0;i<this.dea_record.record_links.length && found==false;i++)
		{
			if(this.dea_record.record_links[i].id==rid && this.dea_record.record_links[i].path==path)
			{
				out=this.dea_record.record_links[i];
				found=true;
			}
		}
	}
	if(found==false && this.dea_record.neobject_grandparent!=null && this.dea_record.neobject_grandparent.id==rid && this.dea_record.neobject_grandparent.path==path)
		out=this.dea_record.neobject_grandparent;
	return out;
}

function loadDEA(path,rid)
{
	loadDEAfields();
	dea_view=new DEAview();
	dea_view.load(path,rid);
}
